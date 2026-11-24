const { artist, spotifySearch } = require("../app/catalog");
const { norm } = require("../app/preferences");
function spotifyLookup(config = process.env, fetcher = fetch) {
  let token = null;
  async function accessToken() {
    if (token && token.until > Date.now()) return token.value;
    const basic = Buffer.from(
      config.SPOTIFY_CLIENT_ID + ":" + config.SPOTIFY_CLIENT_SECRET,
    ).toString("base64");
    const r = await fetcher("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + basic,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw Error("Spotify token " + r.status);
    const data = await r.json();
    if (!data.access_token) throw Error("Spotify token missing");
    token = {
      value: data.access_token,
      until: Date.now() + 1000 * (data.expires_in - 60),
    };
    return token.value;
  }
  return async (track) => {
    const fallback = { url: spotifySearch(track), match: false };
    if (!config.SPOTIFY_CLIENT_ID || !config.SPOTIFY_CLIENT_SECRET)
      return { ...fallback, status: "unconfigured" };
    try {
      const url = new URL("https://api.spotify.com/v1/search");
      url.search = new URLSearchParams({
        q: "track:" + track[1] + " artist:" + artist(track),
        type: "track",
        limit: "5",
      }).toString();
      const r = await fetcher(url, {
        headers: { Authorization: "Bearer " + (await accessToken()) },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) {
        if (r.status === 401) token = null;
        return { ...fallback, status: "unavailable" };
      }
      const json = await r.json(),
        item = json.tracks?.items?.find(
          (t) =>
            norm(t.name) === norm(track[1]) &&
            t.artists.some((a) => norm(a.name) === norm(artist(track))) &&
            /^[A-Za-z0-9]{22}$/.test(t.id),
        );
      return item
        ? {
            url: "https://open.spotify.com/track/" + item.id,
            match: true,
            status: "matched",
          }
        : { ...fallback, status: "not_found" };
    } catch {
      return { ...fallback, status: "unavailable" };
    }
  };
}
module.exports = { spotifyLookup };
