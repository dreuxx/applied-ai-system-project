const model = require("../data/model.json");
const scoreMusic = require("../src/rank.js");
const previews = new Set(require("../data/preview_ids.json"));
const { norm } = require("./preferences");
const byId = new Map(model.tracks.map((track) => [track[0], track]));
const artist = (track) => track[7] ?? model.artists[track[6]];
const source = (track) =>
  track[0].startsWith("track_")
    ? "https://www.jamendo.com/track/" + Number(track[0].slice(6))
    : "https://incompetech.com/music/royalty-free/index.html?isrc=" +
      encodeURIComponent(track[0]);
function describe(t) {
  return {
    id: t[0],
    title: t[1],
    artist: artist(t),
    genres: t[2].map((j) => model.genres[j]),
    moods: t[3].map((j) => model.moods[j]),
    instruments: t[4].map((j) => model.instruments[j]),
    bpm: t[5],
    preview: previews.has(t[0]),
    url: source(t),
  };
}
function searchTracks(query, genre, limit = 15) {
  const words = norm(query).split(/\s+/).filter(Boolean),
    genreId = genre ? model.genres.indexOf(genre) : null;
  const found = [];
  for (const track of model.tracks) {
    if (genreId !== null && !track[2].includes(genreId)) continue;
    const hay = norm(track[1] + " " + artist(track));
    if (words.every((word) => hay.includes(word))) found.push(track);
    if (found.length >= limit) break;
  }
  return found;
}
const recommend = (p) => scoreMusic(model, p, previews);
const spotifySearch = (t) =>
  "https://open.spotify.com/search/" +
  encodeURIComponent(t[1] + " " + artist(t));
module.exports = {
  model,
  byId,
  artist,
  source,
  describe,
  searchTracks,
  recommend,
  spotifySearch,
};
