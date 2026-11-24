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
    $("profileStatus").textContent =
      "Pulsa Recomendar música para aplicar tus cambios.";
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
  const art = JSON.parse($("art").textContent);
  const sleeves = Object.values(art);
  const editorial = ["track_0521030", "track_0030227", "USUAN1100001"].map(
    (id) => d.tracks.find((s) => s[0] === id),
  );
  const browserGenres = d.genres
    .map((genre, index) => ({ genre, index, label: tr(genre) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const dialog = $("trackDialog");
  let latestRows = [],
    latestProfile = null;
  const screenIds = ["home", "explore", "profile"];
  function navigate(id, push = true) {
    if (!screenIds.includes(id)) id = "home";
    for (const key of screenIds) $(key).hidden = key !== id;
    for (const b of document.querySelectorAll("nav [data-view]")) {
      if (b.dataset.view === id) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
    if (push && location.hash !== "#" + id) location.hash = id;
    $(id).querySelector("h1").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.view)));
  window.addEventListener("hashchange", () => {
    const view = location.hash.slice(1) || "home";
    if (!screenIds.includes(view) || $(view).hidden) navigate(view, false);
  });
  function iconArrow() {
    const ns = "http://www.w3.org/2000/svg",
      svg = document.createElementNS(ns, "svg"),
      use = document.createElementNS(ns, "use");
    svg.setAttribute("class", "go");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", "#ico-next");
    svg.append(use);
    return svg;
  }
  function trackRow(song, artSrc, match = null, profile = null) {
    const b = node("button", null, "trackRow"),
      img = node("img", null, "cover"),
      text = node("span");
    img.src = artSrc;
    img.alt = "";
    text.append(
      node("strong", song[1]),
      node("small", song[7] ?? d.artists[song[6]]),
    );
    b.append(img, text, iconArrow());
    b.onclick = () => openTrack(song, artSrc, match, profile);
    return b;
  }
  function renderHome() {
    const personal = latestRows.length > 0;
    $("homeTitle").textContent = personal ? "Para ti" : "En rotación";
    const rows = personal
      ? latestRows.slice(0, 3)
      : editorial.map((s) => ({ s }));
    $("homeTracks").replaceChildren(
      ...rows.map((v, j) =>
        trackRow(
          v.s,
          sleeves[j],
          personal ? v : null,
          personal ? latestProfile : null,
        ),
      ),
    );
  }
  function openTrack(s, artSrc, v, p) {
    const content = $("trackContent");
    content.replaceChildren();
    const img = node("img", null, "sheetArt");
    img.src = artSrc;
    img.alt = "";
    const title = node("h2", s[1]);
    title.id = "trackTitle";
    content.append(
      img,
      title,
      node("p", s[7] ?? d.artists[s[6]], "artist"),
      node(
        "p",
        s[2].map((j) => tr(d.genres[j])).join(" · ") +
          (s[5] === null ? "" : " · " + s[5] + " BPM"),
      ),
    );
    if (v) {
      const detail = node("details"),
        score = Math.round(v.score * 100);
      detail.append(node("summary", score + "/100 · Ver puntuación"));
      const facts = [
        ...v.mh.map((j) => tr(d.moods[j])),
        ...v.ih.map((j) => tr(d.instruments[j])),
      ];
      if (p.bpm !== null)
        facts.push(Math.abs(p.bpm - s[5]) + " BPM de diferencia");
      if (facts.length) detail.append(node("p", facts.join(" · ")));
      const terms = Object.entries(v.parts).map(
        ([k, x]) => (k === "animo" ? "ánimo" : k) + " " + (x * 100).toFixed(1),
      );
      detail.append(
        node(
          "p",
          terms.length
            ? terms.join(" + ") + " puntos."
            : "Todas las coincidencias del género empatan.",
        ),
      );
      content.append(detail);
    }
    if (bank.has(s[0])) {
      const player = node("audio");
      player.controls = true;
      player.preload = "none";
      player.src = "data:audio/mpeg;base64," + audio[s[0]];
      player.setAttribute("aria-label", "Muestra de " + s[1]);
      content.append(player);
    }
    const actions = node("div", null, "actions"),
      similar = node("button", "Usar como perfil", "primary"),
      link = node("a", "Ficha del autor ↗︎");
    similar.onclick = () => {
      dialog.close();
      load({
        g: p?.g ?? null,
        m: s[3],
        i: s[4],
        bpm: s[5],
        seed: s[0],
        previews: p?.previews ?? false,
      });
      draw("Pistas similares");
    };
    link.href = s[0].startsWith("track_")
      ? "https://www.jamendo.com/track/" + Number(s[0].slice(6))
      : "https://incompetech.com/music/royalty-free/index.html?isrc=" +
        encodeURIComponent(s[0]);
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    actions.append(similar, link);
    content.append(actions);
    dialog.showModal();
  }
  $("dismiss").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    $("trackContent").querySelector("audio")?.pause();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  function draw(title = "Tus recomendaciones") {
    const p = {
      g: $("genre").value === "" ? null : +$("genre").value,
      m: [...m],
      i: [...i],
      bpm: $("bpm").value === "" ? null : +$("bpm").value,
      strict: $("strict").checked,
      previews: $("samplesOnly").checked,
      seed,
    };
    const r = scoreMusic(d, p, bank);
    latestProfile = p;
    latestRows = r.rows;
    $("heading").textContent = title;
    $("status").textContent =
      r.status === "empty"
        ? "Elige un género o ajusta tu perfil para empezar."
        : r.status === "no_match"
          ? "Sin coincidencias. Quita una etiqueta o amplía tus filtros."
          : r.rows.length +
            " recomendaciones entre " +
            number(r.eligible) +
            " pistas elegibles.";
    if (seed)
      $("status").textContent +=
        " A partir de " + d.tracks.find((s) => s[0] === seed)[1] + ".";
    $("list").replaceChildren(
      ...r.rows.map((v, j) => trackRow(v.s, sleeves[j % sleeves.length], v, p)),
    );
    $("explain").hidden = !r.rows.length;
    $("explain").open = false;
    $("math").textContent =
      "La puntuación sobre 100 mide compatibilidad con tu selección. " +
      (r.prob.length
        ? "El modelo estima cada género por separado. " +
          r.prob
            .map((v, j) => [v, j])
            .sort((a, b) => b[0] - a[0])
            .slice(0, 3)
            .map(([v, j]) => tr(d.genres[j]) + " " + (100 * v).toFixed(1) + "%")
            .join(", ") +
          "."
        : "");
    $("profileStatus").textContent = "";
    renderHome();
    renderGenres();
    navigate("explore");
  }
  function showGenre(genre, instrument = null) {
    load({
      g: d.genres.indexOf(genre),
      i: instrument ? [d.instruments.indexOf(instrument)] : [],
      strict: !!instrument,
    });
    draw(genre === "Hip Hop" ? "Hip hop" : tr(genre));
  }
  function renderGenres() {
    const q = norm($("genreSearch").value);
    const buttons = browserGenres
      .filter((o) => [o.label, o.genre].some((s) => norm(s).includes(q)))
      .map((o) => {
        const b = node("button", o.label);
        b.setAttribute("aria-pressed", String(latestProfile?.g === o.index));
        b.onclick = () => showGenre(o.genre);
        return b;
      });
    $("genreBrowser").replaceChildren(
      ...(buttons.length
        ? buttons
        : [node("p", "Ningún género coincide con esa búsqueda.")]),
    );
  }
  $("genreSearch").oninput = renderGenres;
  $("allGenres").onclick = () => {
    navigate("explore");
    $("genreSearch").focus();
    $("genreSearch").scrollIntoView({ block: "center" });
  };
  document
    .querySelectorAll("[data-genre]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          showGenre(
            b.dataset.genre,
            { "Hip Hop": "Bass", Jazz: "Piano", Rock: "Guitar" }[
              b.dataset.genre
            ],
          )),
    );
  $("discover").onclick = () => {
    load({ g: d.genres.indexOf("Ambient"), m: [d.moods.indexOf("Relaxed")] });
    draw("Sesión nocturna");
  };
  $("listenable").onclick = () => {
    load({ i: [d.instruments.indexOf("Bass")], previews: true });
    draw("Muestras con bajo");
  };
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
    latestRows = [];
    latestProfile = null;
    $("list").replaceChildren();
    $("heading").textContent = "Explorar";
    $("status").textContent =
      "Elige un género o ajusta tu perfil para empezar.";
    $("explain").hidden = true;
    $("profileStatus").textContent = "Perfil borrado.";
    renderHome();
    renderGenres();
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
  $("status").textContent = "Elige un género o ajusta tu perfil para empezar.";
  renderHome();
  renderGenres();
  navigate(location.hash.slice(1) || "home", false);
})();
