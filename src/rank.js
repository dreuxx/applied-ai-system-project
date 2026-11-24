"use strict";
function scoreMusic(d, p, bank = new Set(), useModel = true) {
  const {
    g = null,
    m = [],
    i = [],
    bpm = null,
    strict = false,
    previews = false,
    seed = null,
  } = p;
  for (const [v, labels] of [
    [m, d.moods],
    [i, d.instruments],
    [g === null ? [] : [g], d.genres],
  ]) {
    if (
      !Array.isArray(v) ||
      v.some((n) => !Number.isInteger(n) || n < 0 || n >= labels.length) ||
      new Set(v).size !== v.length
    )
      throw Error("Etiqueta inválida.");
  }
  if (bpm !== null && (!Number.isInteger(bpm) || bpm < 20 || bpm > 240))
    throw Error("Tempo fuera de rango.");
  if (!seed && g === null && !m.length && !i.length && bpm === null)
    return { status: "empty", rows: [], prob: [] };
  const x = Array(d.w.length - 1).fill(0);
  for (const j of m) x[j] = 1 / Math.sqrt(m.length);
  for (const j of i) x[d.moods.length + j] = 1 / Math.sqrt(i.length);
  if (bpm !== null)
    [65, 115, 165].forEach(
      (t, j) => (x[x.length - 3 + j] = Math.exp(-0.5 * ((bpm - t) / 33) ** 2)),
    );
  const z = d.w[d.w.length - 1].slice();
  x.forEach((v, j) => {
    if (v) for (let c = 0; c < z.length; c++) z[c] += v * d.w[j][c];
  });
  // Genres overlap, so each column has its own sigmoid.
  const prob = z.map((value) => 1 / (1 + Math.exp(-value)));
  const peak = Math.max(...prob);
  const family = (s) =>
    s[6] +
    "|" +
    s[1]
      .toLowerCase()
      .split(/\s+-\s+|\s*\(/)[0]
      .trim();
  const seedSong = seed ? d.tracks.find((s) => s[0] === seed) : null;
  if (seed && !seedSong) throw Error("Pista de origen desconocida.");
  const candidates = [];
  for (const s of d.tracks) {
    if (seedSong && family(seedSong) === family(s)) continue;
    if (
      (g !== null && !s[2].includes(g)) ||
      (previews && !bank.has(s[0])) ||
      (bpm !== null && s[5] === null)
    )
      continue;
    const mh = m.filter((v) => s[3].includes(v)),
      ih = i.filter((v) => s[4].includes(v));
    if (
      (strict && (mh.length < m.length || ih.length < i.length)) ||
      ((m.length || i.length) && !mh.length && !ih.length)
    )
      continue;
    const parts = {};
    let weight = 0;
    if (seedSong) {
      const shared = s[2].filter((j) => seedSong[2].includes(j)).length;
      if (!shared) continue;
      parts.generos =
        (2 * shared) / Math.sqrt(s[2].length * seedSong[2].length);
      weight += 2;
    }
    if (m.length) {
      parts.animo =
        (3 * mh.length) / Math.sqrt(m.length * Math.max(1, s[3].length));
      weight += 3;
    }
    if (i.length) {
      parts.instrumentos =
        (3 * ih.length) / Math.sqrt(i.length * Math.max(1, s[4].length));
      weight += 3;
    }
    if (bpm !== null) {
      parts.tempo = 1.5 * Math.exp(-0.5 * ((bpm - s[5]) / 25) ** 2);
      weight += 1.5;
    }
    if (useModel && (m.length || i.length)) {
      parts.modelo =
        (g === null ? Math.max(...s[2].map((j) => prob[j])) : prob[g]) / peak;
      weight += 1;
    }
    for (const k of Object.keys(parts)) parts[k] /= weight;
    const score = weight ? Object.values(parts).reduce((a, b) => a + b, 0) : 1;
    candidates.push({ s, score, mh, ih, parts });
  }
  candidates.sort((a, b) => b.score - a.score || (a.s[0] < b.s[0] ? -1 : 1));
  // Diversify equally scored recordings while preserving score order.
  const seen = new Set(),
    artists = new Set(),
    rows = [];
  function add(r) {
    const key = family(r.s);
    if (seen.has(key)) return;
    seen.add(key);
    artists.add(r.s[6]);
    rows.push(r);
  }
  for (let start = 0; start < candidates.length && rows.length < 5; ) {
    let end = start + 1;
    while (
      end < candidates.length &&
      candidates[end].score === candidates[start].score
    )
      end++;
    for (let j = start; j < end && rows.length < 5; j++) {
      if (!artists.has(candidates[j].s[6])) add(candidates[j]);
    }
    for (let j = start; j < end && rows.length < 5; j++) add(candidates[j]);
    start = end;
  }
  return {
    status: rows.length ? "ok" : "no_match",
    rows,
    eligible: candidates.length,
    prob: m.length || i.length ? prob : [],
  };
}
if (typeof module !== "undefined") module.exports = scoreMusic;
