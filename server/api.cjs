const {
  model,
  byId,
  describe,
  searchTracks,
  recommend,
} = require("../app/catalog");
const { tr, norm } = require("../app/preferences");
const spotify = require("./spotify.cjs").spotifyLookup();
const json = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
function label(value, labels) {
  if (typeof value !== "string") throw Error("Etiqueta inválida");
  const idx = labels.findIndex(
    (x) => norm(x) === norm(value) || norm(tr(x)) === norm(value),
  );
  if (idx < 0) throw Error("Etiqueta desconocida: " + value);
  return idx;
}
function profile(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some(
      (k) =>
        ![
          "genre",
          "moods",
          "instruments",
          "bpm",
          "strict",
          "previews",
          "seed",
        ].includes(k),
    )
  )
    throw Error("Perfil inválido");
  for (const k of ["strict", "previews"])
    if (body[k] !== undefined && typeof body[k] !== "boolean")
      throw Error("Se esperaba un booleano");
  if (body.seed != null && !byId.has(body.seed))
    throw Error("Pista de origen desconocida");
  const list = (v, labels) => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.length > labels.length)
      throw Error("Lista inválida");
    return v.map((x) => label(x, labels));
  };
  return {
    g: body.genre == null ? null : label(body.genre, model.genres),
    m: list(body.moods, model.moods),
    i: list(body.instruments, model.instruments),
    bpm: body.bpm ?? null,
    strict: body.strict ?? false,
    previews: body.previews ?? false,
    seed: body.seed ?? null,
  };
}
async function handle(req) {
  const url = new URL(req.url),
    path = url.pathname,
    method = req.method;
  const match = path.match(/^\/api\/tracks\/([\w-]+)(\/spotify)?$/);
  const read =
    ["/api/health", "/api/genres", "/api/tracks"].includes(path) || !!match;
  if (!read && path !== "/api/recommendations")
    return json({ error: "Ruta desconocida" }, 404);
  const allowed = read ? "GET" : "POST";
  if (method !== allowed)
    return json({ error: "Método no permitido" }, 405, { Allow: allowed });
  if (path === "/api/health")
    return json({
      status: "ok",
      tracks: model.tracks.length,
      genres: model.genres.length,
    });
  if (path === "/api/genres") return json({ genres: model.genres });
  if (match) {
    const t = byId.get(match[1]);
    if (!t) return json({ error: "Pista desconocida" }, 404);
    return json(match[2] ? await spotify(t) : describe(t));
  }
  try {
    if (read) {
      const q = url.searchParams.get("q") ?? "",
        g = url.searchParams.get("genre"),
        limit = Number(url.searchParams.get("limit") ?? 15);
      if (q.length > 180 || !Number.isInteger(limit) || limit < 1 || limit > 50)
        throw Error("Consulta inválida");
      return json({
        tracks: searchTracks(
          q,
          g ? model.genres[label(g, model.genres)] : null,
          limit,
        ).map(describe),
      });
    }
    if (!req.headers.get("content-type")?.includes("application/json"))
      return json({ error: "Usa application/json" }, 415);
    const text = await req.text();
    if (Buffer.byteLength(text) > 16384)
      return json({ error: "Perfil demasiado grande" }, 413);
    const r = recommend(profile(JSON.parse(text)));
    return json({
      status: r.status,
      prob: r.prob,
      eligible: r.eligible ?? 0,
      results: r.rows.map((v) => ({
        ...describe(v.s),
        score: v.score,
        parts: v.parts,
      })),
    });
  } catch (e) {
    return json(
      { error: e instanceof SyntaxError ? "JSON inválido" : e.message },
      400,
    );
  }
}
module.exports = { handle };
