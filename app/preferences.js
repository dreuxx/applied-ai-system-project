const d = require("../data/model.json");
const dictionary = {
  Happy: "Feliz",
  Sad: "Triste",
  Soft: "Suave",
  Dream: "Sueño",
  Positive: "Positivo",
  Powerful: "Potente",
  Romantic: "Romántico",
  Love: "Amor",
  Party: "Fiesta",
  Hopeful: "Esperanzador",
  Emotional: "Emotivo",
  Inspiring: "Inspirador",
  Fun: "Divertido",
  Adventure: "Aventura",
  Sport: "Deporte",
  Mellow: "Apacible",
  Meditative: "Meditativo",
  Fast: "Rápido",
  Slow: "Lento",
  Dance: "Dance",
  "Acoustic Guitar": "Guitarra acústica",
  "Electric Guitar": "Guitarra eléctrica",
  "Classical Guitar": "Guitarra clásica",
  "Electric Piano": "Piano eléctrico",
  "Double Bass": "Contrabajo",
  Keyboard: "Teclado",
  "Drum Machine": "Caja de ritmos",
  Electronic: "Electronic",
  Relaxed: "Relajado",
  Calming: "Calmante",
  Intense: "Intenso",
  Dark: "Oscuro",
  Mysterious: "Misterioso",
  Bright: "Luminoso",
  Driving: "Enérgico",
  Grooving: "Rítmico",
  Eerie: "Inquietante",
  Bouncy: "Juguetón",
  Action: "Acción",
  Epic: "Épico",
  Humorous: "Cómico",
  Somber: "Melancólico",
  Uplifting: "Animado",
  Suspenseful: "Suspenso",
  Unnerving: "Perturbador",
  Mystical: "Místico",
  Aggressive: "Agresivo",
  Guitar: "Guitarra",
  Bass: "Bajo",
  Drums: "Batería",
  Strings: "Cuerdas",
  Flute: "Flauta",
  Cello: "Violonchelo",
  Harp: "Arpa",
  Synth: "Sintetizador",
  Voice: "Voces",
  Organ: "Órgano",
  Trumpet: "Trompeta",
  Percussion: "Percusión",
  Violin: "Violín",
  Classical: "Clásica",
  Horror: "Terror",
  Soundtrack: "Banda sonora",
  Electronica: "Electrónica",
  Latin: "Latina",
  World: "Músicas del mundo",
  Contemporary: "Contemporánea",
  Clarinet: "Clarinete",
  Orchestra: "Orquesta",
  Holiday: "Festiva",
  African: "Africana",
  Oboe: "Oboe",
  Sax: "Saxofón",
  Horn: "Trompa",
  Bells: "Campanas",
  Bassoon: "Fagot",
  Harpsichord: "Clavecín",
  Accordion: "Acordeón",
  Trombone: "Trombón",
  Harmonica: "Armónica",
  Timpani: "Timbales",
  Lute: "Laúd",
  Mandolin: "Mandolina",
  Vibraphone: "Vibráfono",
  Xylophone: "Xilófono",
  "Silent Film Score": "Cine mudo",
  Unclassifiable: "Sin clasificar",
};

const tr = (s) => dictionary[s] || s;
const norm = (s) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
function table(text) {
  const out = [];
  let row = [],
    v = "",
    state = 0;
  const end = () => {
    row.push(v);
    if (row.some((x) => x.trim())) out.push(row);
    row = [];
    v = "";
    state = 0;
  };
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let j = 0; j < text.length; j++) {
    const c = text[j];
    if (state === 1) {
      if (c === '"') {
        if (text[j + 1] === '"') {
          v += '"';
          j++;
        } else state = 2;
      } else v += c;
    } else if (c === ",") {
      row.push(v);
      v = "";
      state = 0;
    } else if (c === "\n") end();
    else if (state === 2) throw Error("Comillas inválidas.");
    else if (c === '"' && !v) state = 1;
    else v += c;
  }
  if (state === 1) throw Error("Comillas sin cerrar.");
  end();
  return out;
}
function parse(text) {
  const rows = table(text);
  if (
    rows.shift()?.map(norm).join(",") !==
      "nombre,genero,animos,instrumentos,bpm,estricto,solo_muestras" ||
    !rows.length ||
    rows.length > 100
  )
    throw Error("Usa el encabezado de preferencias.csv y de 1 a 100 perfiles.");
  const ids = (v, ls) =>
    v.trim()
      ? [
          ...new Set(
            v.split("|").map((t) => {
              const j = ls.findIndex((l) =>
                [norm(l), norm(tr(l))].includes(norm(t)),
              );
              if (j < 0) throw Error("Etiqueta desconocida: " + t);
              return j;
            }),
          ),
        ]
      : [];
  return rows.map((r, k) => {
    if (
      r.length !== 7 ||
      !r[0].trim() ||
      ![r[5], r[6]].every((x) => ["0", "1", ""].includes(x.trim()))
    )
      throw Error("Fila inválida: " + (k + 2));
    const gs = ids(r[1], d.genres),
      p = {
        name: r[0],
        g: gs[0] ?? null,
        m: ids(r[2], d.moods),
        i: ids(r[3], d.instruments),
        bpm: r[4].trim() ? Number(r[4]) : null,
        strict: r[5].trim() === "1",
        previews: r[6].trim() === "1",
      };
    if (
      gs.length > 1 ||
      (p.bpm !== null &&
        (!Number.isInteger(p.bpm) || p.bpm < 20 || p.bpm > 240)) ||
      (p.g === null && !p.i.length && !p.m.length && p.bpm === null)
    )
      throw Error("Revisa el perfil de la fila " + (k + 2));
    return p;
  });
}

module.exports = { tr, norm, parseCSV: parse };
