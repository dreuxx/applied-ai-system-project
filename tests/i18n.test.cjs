const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  languages,
  strings,
  phrases,
  t,
  label,
  message,
  pick,
} = require("../app/i18n");
const { handle } = require("../server/api.cjs");
test("Spanish and English define the same interface texts", () => {
  assert.deepEqual(languages, ["es", "en"]);
  assert.deepEqual(Object.keys(strings.en), Object.keys(strings.es));
  for (const key of Object.keys(strings.es)) {
    const holes = (s) => (s.match(/\{\w+\}/g) ?? []).sort();
    assert(strings.es[key].trim() && strings.en[key].trim(), key);
    assert.deepEqual(holes(strings.en[key]), holes(strings.es[key]), key);
  }
});
test("every text the screens ask for exists", () => {
  const dir = path.join(__dirname, "../app");
  const source = fs
    .readdirSync(dir)
    .map((name) => fs.readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
  const fixed = [...source.matchAll(/\bt\(\s*"([^"]+)"\s*[,)]/g)].map(
    (m) => m[1],
  );
  const choices = [
    ...source.matchAll(/\bt\(\s*[^"?()]+\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g),
  ].flatMap((m) => [m[1], m[2]]);
  const stems = [...source.matchAll(/\bt\(\s*"([^"]+\.)"\s*\+/g)].map(
    (m) => m[1],
  );
  assert(fixed.length > 40 && choices.length >= 8 && stems.length >= 5);
  for (const key of [...fixed, ...choices]) assert(key in strings.es, key);
  for (const stem of stems)
    assert(
      Object.keys(strings.es).some((key) => key.startsWith(stem)),
      stem,
    );
  for (const key of [
    ...["Inicio", "Explorar", "Perfil"].map((v) => "nav." + v),
    ...["g", "m", "i"].flatMap((k) => ["field." + k, "chooseLabel." + k]),
    ...["m", "i"].map((k) => "choose." + k),
    ...["generos", "animo", "instrumentos", "tempo", "modelo"].map(
      (k) => "part." + k,
    ),
    ...["matched", "unconfigured", "not_found", "unavailable"].map(
      (k) => "spotify." + k,
    ),
  ])
    assert(key in strings.en, key);
});
test("texts, tag names and messages follow the chosen language", () => {
  assert.equal(t("es", "recommend"), "Recomendar música");
  assert.equal(t("en", "recommend"), "Recommend music");
  assert.equal(
    t("en", "note.ok", { n: 5, eligible: 618, via: t("en", "via.local") }),
    "5 recommendations from 618 tracks · local model",
  );
  assert.throws(() => t("en", "missing"));
  assert.equal(label("es", "Bass"), "Bajo");
  assert.equal(label("en", "Bass"), "Bass");
  assert.equal(message("es", "Tempo fuera de rango."), "Tempo fuera de rango.");
  assert.equal(message("en", "Tempo fuera de rango."), "Tempo out of range.");
  assert.equal(message("en", "Etiqueta inválida"), "Invalid label");
  assert.equal(
    message("en", "Etiqueta desconocida: Banjo"),
    "Unknown label: Banjo",
  );
  assert.equal(message("en", "Fila inválida: 3"), "Invalid row: 3");
  assert.equal(message("en", "Otro texto"), "Otro texto");
});
test("every Spanish message raised by the code has an English version", () => {
  const files = [
    "app/App.js",
    "app/Profile.js",
    "app/TrackSheet.js",
    "app/client.js",
    "app/preferences.js",
    "src/rank.js",
    "server/api.cjs",
    "server/middleware.cjs",
  ];
  const raised = files.flatMap((name) => {
    const source = fs.readFileSync(path.join(__dirname, "..", name), "utf8");
    return [
      ...source.matchAll(
        /(?:Error|setError|setNotice|fail)\(\s*(?:\d+,\s*)?"([^"]+)"\s*(\+)?/g,
      ),
      ...source.matchAll(/error:\s*"([^"]+)"\s*()/g),
      ...source.matchAll(/\?\s*"(JSON inválido)"\s*()/g),
    ].map((m) => [m[1], Boolean(m[2])]);
  });
  assert(raised.length >= 25, String(raised.length));
  for (const [text, dynamic] of raised)
    assert.notEqual(
      message("en", dynamic ? text + "x" : text),
      dynamic ? text + "x" : text,
      text,
    );
  assert(Object.keys(phrases).every((text) => !text.endsWith(".")));
});
test("REST errors are Spanish by default and English on request", async () => {
  const ask = (lang) =>
    handle(
      new Request("http://localhost/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(lang ? { "Accept-Language": lang } : {}),
        },
        body: JSON.stringify({ genre: "bad" }),
      }),
    );
  assert.equal(pick(undefined), "es");
  assert.equal(pick("es-ES,es;q=0.9,en;q=0.8"), "es");
  assert.equal(pick("en-US,en;q=0.9"), "en");
  for (const [lang, error] of [
    [null, "Etiqueta desconocida: bad"],
    ["es", "Etiqueta desconocida: bad"],
    ["en-US,en;q=0.9", "Unknown label: bad"],
  ]) {
    const r = await ask(lang);
    assert.equal(r.status, 400);
    assert.deepEqual(await r.json(), { error });
  }
  const wrong = await handle(
    new Request("http://localhost/api/recommendations", {
      headers: { "Accept-Language": "en" },
    }),
  );
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.get("allow"), "POST");
  assert.equal((await wrong.json()).error, "Method not allowed");
});
