import React, { useState } from "react";
import { Image, Linking } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { artist, model, source, spotifySearch } from "./catalog";
import { audio, art } from "./media";
import { useLang } from "./lang";
import { api } from "./client";
import { T, Button, Sheet, st } from "./design";
function Preview({ id }) {
  const { t } = useLang();
  const player = useAudioPlayer(audio[id]);
  const status = useAudioPlayerStatus(player);
  async function toggle() {
    if (status.playing) player.pause();
    else {
      if (
        status.didJustFinish ||
        (status.duration > 0 && status.currentTime >= status.duration - 0.1)
      )
        await player.seekTo(0);
      player.play();
    }
  }
  return (
    <Button onPress={toggle}>{t(status.playing ? "pause" : "play")}</Button>
  );
}
export default function TrackSheet({ item, onClose, onSeed }) {
  const { s, score, parts } = item;
  const { t, label, message } = useLang();
  const [lookup, setLookup] = useState(null),
    [working, setWorking] = useState(false),
    [error, setError] = useState("");
  async function find() {
    setWorking(true);
    setError("");
    try {
      setLookup(await api("/tracks/" + s[0] + "/spotify"));
    } catch (e) {
      setError(e.message);
      setLookup({ status: "unavailable", url: spotifySearch(s) });
    } finally {
      setWorking(false);
    }
  }
  const open = (url) =>
    Linking.openURL(url).catch(() => setError("No se pudo abrir el enlace."));
  return (
    <Sheet title={s[1]} onClose={onClose}>
      <Image
        source={item.cover || art.rain}
        style={{ width: 84, height: 84, borderRadius: 10 }}
      />
      <T style={st.h2}>{artist(s)}</T>
      <T>
        {s[2].map((j) => label(model.genres[j])).join(" · ")}
        {s[5] === null ? "" : " · " + s[5] + " BPM"}
      </T>
      {score !== undefined && (
        <>
          <T>{t("compat", { n: Math.round(score * 100) })}</T>
          <T style={st.small}>
            {Object.keys(parts).length
              ? Object.entries(parts)
                  .map(([k, v]) => t("part." + k) + " " + (100 * v).toFixed(1))
                  .join(" + ")
              : t("genreMatch")}
          </T>
        </>
      )}
      {audio[s[0]] && <Preview id={s[0]} />}
      <Button primary onPress={() => onSeed(s)}>
        {t("seed")}
      </Button>
      <Button onPress={() => open(source(s))}>{t("source")}</Button>
      {!lookup ? (
        <Button onPress={find} disabled={working}>
          {t(working ? "spotifyFinding" : "spotifyFind")}
        </Button>
      ) : (
        <>
          <T style={st.small}>{t("spotify." + lookup.status)}</T>
          <Button onPress={() => open(lookup.url)}>
            {t(lookup.match ? "spotifyOpenTrack" : "spotifyOpenSearch")}
          </Button>
        </>
      )}
      {error ? <T style={st.small}>{message(error)}</T> : null}
    </Sheet>
  );
}
