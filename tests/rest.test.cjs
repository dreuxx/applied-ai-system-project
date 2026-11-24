const test = require("node:test"),
  assert = require("node:assert/strict");
const { handle } = require("../server/api.cjs");
const { byId, recommend, model } = require("../app/catalog");
const { spotifyLookup } = require("../server/spotify.cjs");
const req = (path, opts) =>
  handle(new Request("http://localhost/api" + path, opts));
const post = (profile) =>
  req("/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
test("catalog count, genres, track detail and multi-artist search", async () => {
  const health = await (await req("/health")).json();
  assert.equal(health.tracks, 56656);
  assert.equal((await (await req("/genres")).json()).genres.length, 103);
  const list = await (
    await req("/tracks?q=Kellee%20Maize&genre=Hip%20Hop&limit=4")
  ).json();
  assert.equal(list.tracks.length, 4);
  assert(
    list.tracks.every(
      (x) => x.artist === "Kellee Maize" && x.genres.includes("Hip Hop"),
    ),
  );
  const track = await (await req("/tracks/track_0521030")).json();
  assert.equal(track.title, "Big Plans Remix");
  assert.equal((await req("/tracks/none")).status, 404);
});
test("REST and local ranker return identical tracks and scores", async () => {
  const p = { genre: "Hip Hop", instruments: ["Bajo"], strict: true },
    r = await (await post(p)).json();
  const local = recommend({
    g: model.genres.indexOf("Hip Hop"),
    i: [model.instruments.indexOf("Bass")],
    strict: true,
  });
  assert.deepEqual(
    r.results.map((x) => [x.id, x.score]),
    local.rows.map((v) => [v.s[0], v.score]),
  );
  assert.equal(r.results[0].title, "Big Plans Remix");
});
test("profile guardrails, malformed input and method handling", async () => {
  assert.equal((await (await post({})).json()).status, "empty");
  for (const p of [
    { bpm: 2 },
    { genre: "bad" },
    { instruments: "Bass" },
    { strict: "yes" },
    { typo: true },
  ])
    assert.equal((await post(p)).status, 400);
  assert.equal((await req("/tracks?limit=-1")).status, 400);
  assert.equal((await req("/recommendations")).status, 405);
  assert.equal(
    (await req("/recommendations", { method: "POST", body: "text" })).status,
    415,
  );
});
test("Spotify without keys uses a search link", async () => {
  const r = await spotifyLookup({}, () => {
    throw Error("unexpected network");
  })(byId.get("track_0521030"));
  assert.equal(r.status, "unconfigured");
  assert(r.url.includes("Kellee%20Maize"));
});
test("Spotify exact title/artist, token reuse, unavailable and no-match states with a test double", async () => {
  const t = byId.get("track_0521030"),
    env = { SPOTIFY_CLIENT_ID: "demo", SPOTIFY_CLIENT_SECRET: "demo" };
  let tokens = 0,
    mode = "exact";
  const lookup = spotifyLookup(env, async (url) => {
    if (String(url).includes("accounts.spotify")) {
      tokens++;
      return Response.json({ access_token: "test", expires_in: 3600 });
    }
    if (mode === "limit") return new Response(null, { status: 429 });
    return Response.json({
      tracks: {
        items: [
          {
            id: "A".repeat(22),
            name: "Big Plans Remix",
            artists: [
              { name: mode === "exact" ? "Kellee Maize" : "Other artist" },
            ],
          },
        ],
      },
    });
  });
  assert.equal((await lookup(t)).status, "matched");
  mode = "other";
  assert.equal((await lookup(t)).status, "not_found");
  mode = "limit";
  assert.equal((await lookup(t)).status, "unavailable");
  assert.equal(tokens, 1);
});
test("Netlify adapter dispatches REST requests", async () => {
  const { default: fn, config } = await import("../netlify/functions/api.mjs");
  assert.equal(config.path, "/api/*");
  assert.equal(
    (await fn(new Request("http://localhost/api/health"))).status,
    200,
  );
});
