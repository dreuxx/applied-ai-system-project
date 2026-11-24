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
  if (g === null && !m.length && !i.length && bpm === null)
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
  const highest = Math.max(...z),
    e = z.map((v) => Math.exp(v - highest)),
    sum = e.reduce((a, b) => a + b, 0),
    prob = e.map((v) => v / sum),
    peak = Math.max(...prob);
  const family = (t) =>
      t
        .toLowerCase()
        .split(/\s+-\s+|\s*\(/)[0]
        .trim(),
    seedSong = d.tracks.find((s) => s[0] === seed),
    candidates = [];
  for (const s of d.tracks) {
    if (seedSong && family(seedSong[1]) === family(s[1])) continue;
    if (
      (g !== null && g !== s[2]) ||
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
      parts.modelo = prob[s[2]] / peak;
      weight += 1;
    }
    for (const k of Object.keys(parts)) parts[k] /= weight;
    const score = weight ? Object.values(parts).reduce((a, b) => a + b, 0) : 1;
    candidates.push({ s, score, mh, ih, parts });
  }
  candidates.sort((a, b) => b.score - a.score || (a.s[0] < b.s[0] ? -1 : 1));
  const seen = new Set(),
    rows = [];
  for (const r of candidates) {
    const f = family(r.s[1]);
    if (!seen.has(f)) {
      seen.add(f);
      rows.push(r);
    }
    if (rows.length === 5) break;
  }
  return {
    status: rows.length ? "ok" : "no_match",
    rows,
    eligible: candidates.length,
    prob: m.length || i.length ? prob : [],
  };
}
if (typeof module !== "undefined") module.exports = scoreMusic;
