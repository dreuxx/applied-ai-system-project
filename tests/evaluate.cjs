const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  d = require("../data/model.json"),
  rank = require("../src/rank.js");
const profiles = [
  ["Hip hop with bass", "Hip Hop", "", "Bass"],
  ["Reggae with guitar", "Reggae", "", "Guitar"],
  ["Jazz with piano", "Jazz", "", "Piano"],
  ["Study jazz", "Jazz", "Relaxed", "Piano", 90],
  ["Workout rock", "Rock", "Intense", "Guitar", 140],
  ["Horror", "Horror", "Eerie|Dark", ""],
  ["Funk", "Funk", "Grooving", "Bass"],
  ["Soft guitar", "", "Relaxed|Calming", "Guitar"],
  ["Playful flute", "", "Bouncy|Humorous", "Flute"],
  ["Hopeful orchestra", "", "Uplifting|Epic", "Orchestra"],
  ["Harp", "", "Calming", "Harp"],
  ["Strings", "", "Somber|Dark", "Strings"],
  ["Electronic drive", "Electronica", "Driving", "Synth"],
  ["Bright brass", "", "Bright|Grooving", "Trumpet"],
  ["Mysterious piano", "", "Mysterious", "Piano"],
  ["Tension", "", "Suspenseful|Intense", "Percussion"],
  ["Organ", "", "Grooving", "Organ"],
  ["Reflective cello", "", "Relaxed|Calming", "Cello"],
  ["Reggae", "Reggae", "Grooving", "Drums"],
];
const ids = (s, a) =>
  s
    ? s.split("|").map((k) => {
        let ix = a.indexOf(k);
        assert(ix >= 0);
        return ix;
      })
    : [];
let direct = 0,
  hybrid = 0,
  changed = 0;
const detail = [];
for (const [name, g, m, i, bpm] of profiles) {
  const p = {
    g: g ? d.genres.indexOf(g) : null,
    m: ids(m, d.moods),
    i: ids(i, d.instruments),
    bpm: bpm ?? null,
  };
  const runs = [false, true].map((flag) =>
    rank(d, p, new Set(), flag).rows.slice(0, 3),
  );
  const hits = runs.map(
    (rows) =>
      rows.filter(
        ({ s }) =>
          (p.g === null || s[2].includes(p.g)) &&
          (!p.m.length || p.m.some((j) => s[3].includes(j))) &&
          (!p.i.length || p.i.some((j) => s[4].includes(j))) &&
          (p.bpm === null || (s[5] !== null && Math.abs(s[5] - p.bpm) <= 30)),
      ).length,
  );
  direct += hits[0];
  hybrid += hits[1];
  changed += Number(runs[0][0]?.s[0] !== runs[1][0]?.s[0]);
  detail.push({
    name,
    input: p,
    direct: runs[0].map((v) => v.s[1]),
    hybrid: runs[1].map((v) => v.s[1]),
    hits,
    components: runs[1][0]?.parts,
  });
}
const jazz = rank(d, {
  g: d.genres.indexOf("Jazz"),
  m: ids("Relaxed", d.moods),
  i: ids("Piano", d.instruments),
  bpm: 90,
  strict: true,
});
assert.equal(jazz.rows[0].s[1], "Samba Isobel");
assert.equal(detail[4].hybrid[0], "Neolith");
assert.equal(rank(d, {}).status, "empty");
assert.equal(
  rank(d, {
    g: d.genres.indexOf("Urban"),
    i: ids("Harpsichord", d.instruments),
    strict: true,
  }).status,
  "no_match",
);
assert.throws(() => rank(d, { bpm: -1 }));
assert.throws(() => rank(d, { i: [999] }));
assert(
  jazz.prob.length === d.genres.length &&
    jazz.prob.every((v) => v >= 0 && v <= 1),
);
assert(
  jazz.rows.every(
    (v) =>
      Math.abs(Object.values(v.parts).reduce((a, b) => a + b) - v.score) < 1e-8,
  ),
);
assert.deepEqual(
  jazz,
  rank(d, {
    g: d.genres.indexOf("Jazz"),
    m: ids("Relaxed", d.moods),
    i: ids("Piano", d.instruments),
    bpm: 90,
    strict: true,
  }),
);
for (let g = 0; g < d.genres.length; g++) {
  const rows = rank(d, { g }).rows;
  assert(rows.length > 0 && rows.every((v) => v.s[2].includes(g)));
}
const hop = rank(d, {
  g: d.genres.indexOf("Hip Hop"),
  i: ids("Bass", d.instruments),
  strict: true,
}).rows;
assert.equal(new Set(hop.map((v) => v.s[6])).size, 5);
const seed = hop[0].s;
const related = rank(d, { seed: seed[0] }).rows;
assert(
  related.length &&
    related.every(
      (v) => v.s[0] !== seed[0] && v.s[2].some((j) => seed[2].includes(j)),
    ),
);
const out = {
  profiles: profiles.length,
  slots: profiles.length * 3,
  direct,
  hybrid,
  changed,
  detail,
};
if (process.argv.includes("--write"))
  fs.writeFileSync("evidence/ranking.json", JSON.stringify(out, null, 2));
console.log({
  profiles: out.profiles,
  slots: out.slots,
  direct,
  hybrid,
  changed,
  genreFilters: d.genres.length,
});
for (const item of detail.slice(0, 5))
  console.log(item.name + ":", item.hybrid.join(", "));
console.log("Empty: empty; Urban + Harpsichord (strict): no_match");
