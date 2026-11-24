"use strict";
(() => {
  const $ = (s) => document.getElementById(s),
    d = JSON.parse($("model").textContent),
    audio = JSON.parse($("audio").textContent),
    bank = new Set(Object.keys(audio));
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
  const tr = (s) => dictionary[s] || s,
    node = (t, v, cls) => {
      const n = document.createElement(t);
      if (v != null) n.textContent = v;
      if (cls) n.className = cls;
      return n;
    };
  const number = (n) => n.toLocaleString("es-ES");
  $("catalogInfo").textContent =
    "Compara tus preferencias con " +
    number(d.tracks.length) +
    " canciones de " +
    number(d.artists.length) +
    " artistas. Puedes explorar " +
    d.genres.length +
    " géneros sin conexión.";
  let m = [],
    i = [],
    seed = null,
    profiles = [],
    revision = 0;
  function opts(id, labels, caption, chosen = []) {
    const sel = $(id);
    sel.replaceChildren(new Option(caption, ""));
    labels
      .map((t, j) => [tr(t), j])
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .forEach(([l, j]) => {
        const o = new Option(l, j);
        o.disabled = chosen.includes(j);
        sel.add(o);
      });
  }
  function dirty() {
    seed = null;
    $("list").replaceChildren();
    $("explain").hidden = true;
    $("status").textContent =
      "Pulsa Recomendar música para comparar este perfil.";
  }
  function chips() {
    for (const [id, arr, labels, div] of [
      ["mood", m, d.moods, "mchips"],
      ["instrument", i, d.instruments, "ichips"],
    ]) {
      opts(id, labels, "Añadir…", arr);
      $(div).replaceChildren();
      for (const j of arr) {
        const b = node("button", tr(labels[j]) + " ×", "chip");
        b.type = "button";
        b.onclick = () => {
          arr.splice(arr.indexOf(j), 1);
          chips();
          dirty();
        };
        $(div).append(b);
      }
      $(id).onchange = () => {
        if ($(id).value !== "") {
          arr.push(+$(id).value);
          chips();
          dirty();
        }
      };
    }
  }
  function load(p) {
    m = [...(p.m || [])];
    i = [...(p.i || [])];
    seed = p.seed || null;
    $("genre").value = p.g ?? "";
    $("bpm").value = p.bpm ?? "";
    $("strict").checked = !!p.strict;
    $("samplesOnly").checked = !!p.previews;
    chips();
  }
  function draw(move = true) {
    const p = {
      g: $("genre").value === "" ? null : +$("genre").value,
      m,
      i,
      bpm: $("bpm").value === "" ? null : +$("bpm").value,
      strict: $("strict").checked,
      previews: $("samplesOnly").checked,
      seed,
    };
    const r = scoreMusic(d, p, bank);
    $("list").replaceChildren();
    $("explain").hidden = r.status === "empty";
    $("status").textContent =
      r.status === "empty"
        ? "Elige un género, ánimo, instrumento o tempo para empezar."
        : r.status === "no_match"
          ? "Sin coincidencias. Quita una etiqueta o amplía los filtros."
          : r.rows.length +
            " recomendaciones entre " +
            r.eligible +
            " pistas elegibles.";
    if (seed)
      $("status").textContent +=
        " Perfil de referencia: " +
        d.tracks.find((s) => s[0] === seed)[1] +
        ".";
    for (const v of r.rows) {
      const s = v.s,
        a = node("article", null, "card"),
        h = node("div", null, "head");
      h.append(
        node("h3", s[1]),
        node("small", Math.round(v.score * 100) + "/100"),
      );
      a.append(
        h,
        node(
          "p",
          (s[7] ?? d.artists[s[6]]) +
            " · " +
            s[2].map((j) => tr(d.genres[j])).join(" / ") +
            " · " +
            (s[5] === null ? "Tempo sin datos" : s[5] + " BPM"),
        ),
      );
      const facts = [
        ...v.mh.map((j) => tr(d.moods[j])),
        ...v.ih.map((j) => tr(d.instruments[j])),
      ];
      if (p.bpm !== null)
        facts.push("diferencia de " + Math.abs(p.bpm - s[5]) + " BPM");
      if (facts.length)
        a.append(node("p", "Coincidencias: " + facts.join(" · ")));
      const detail = node("details");
      detail.append(
        node("summary", "Ver puntuación"),
        node(
          "p",
          Object.keys(v.parts).length
            ? Object.entries(v.parts)
                .map(([k, x]) => k + " " + (x * 100).toFixed(1))
                .join(" + ") + " puntos."
            : "Todas las coincidencias del género empatan.",
        ),
      );
      a.append(detail);
      if (bank.has(s[0])) {
        const player = node("audio");
        player.controls = true;
        player.preload = "none";
        player.src = "data:audio/mpeg;base64," + audio[s[0]];
        a.append(player);
      }
      const b = node("button", "Usar como perfil", "link");
      b.onclick = () => {
        load({
          g: p.g,
          m: s[3],
          i: s[4],
          bpm: s[5],
          seed: s[0],
          previews: p.previews,
        });
        draw();
      };
      a.append(b);
      const link = node("a", "Ficha del autor ↗");
      link.href = s[0].startsWith("track_")
        ? "https://www.jamendo.com/track/" + Number(s[0].slice(6))
        : "https://incompetech.com/music/royalty-free/index.html?isrc=" +
          encodeURIComponent(s[0]);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      a.append(link);
      $("list").append(a);
    }
    $("math").textContent =
      "La puntuación sobre 100 mide compatibilidad con tu selección. " +
      (r.prob.length
        ? "El modelo estima cada etiqueta de género por separado; una canción puede tener varias: " +
          r.prob
            .map((v, j) => [v, j])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 3)
            .map(([v, j]) => tr(d.genres[j]) + " " + (v * 100).toFixed(1) + "%")
            .join(", ") +
          "."
        : "");
    if (move && matchMedia("(max-width:700px)").matches) {
      $("heading").focus();
      $("result").scrollIntoView();
    }
  }
  opts("genre", d.genres, "Cualquier género");
  chips();
  for (const id of ["genre", "bpm", "strict", "samplesOnly"])
    $(id).oninput = dirty;
  $("form").onsubmit = (e) => {
    e.preventDefault();
    draw();
  };
  $("reset").onclick = () => {
    load({});
    draw(false);
  };
  $("preset").onclick = () => {
    load({
      g: d.genres.indexOf("Hip Hop"),
      m: [],
      i: [d.instruments.indexOf("Bass")],
      bpm: null,
      strict: true,
    });
    draw();
  };
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
      throw Error(
        "Usa el encabezado de preferencias.csv y de 1 a 100 perfiles.",
      );
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
  $("file").onchange = async () => {
    const rev = ++revision;
    profiles = [];
    $("imported").hidden = true;
    $("saved").replaceChildren();
    $("csvStatus").textContent = "";
    try {
      const f = $("file").files[0];
      if (!f) return;
      if (f.size > 131072) throw Error("Máximo 128 KiB.");
      const ps = parse(await f.text());
      if (rev !== revision) return;
      profiles = ps;
      ps.forEach((p, j) => $("saved").add(new Option(p.name, j)));
      $("imported").hidden = false;
      $("csvStatus").textContent = ps.length + " perfiles disponibles.";
    } catch (e) {
      if (rev === revision) $("csvStatus").textContent = e.message;
    }
  };
  $("apply").onclick = () => {
    if (profiles.length) {
      load(profiles[+$("saved").value]);
      draw();
    }
  };
})();
