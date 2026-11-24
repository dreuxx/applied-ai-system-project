import React, { useState } from "react";
import { Image, Linking } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { artist, model, source, spotifySearch } from "./catalog";
import { audio, art } from "./media";
import { tr } from "./preferences";
import { api } from "./client";
import { T, Button, Sheet, st } from "./design";
function Preview({ id }) {
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
    <Button onPress={toggle}>
      {status.playing ? "Pausar muestra" : "Reproducir muestra · 7 s"}
    </Button>
  );
}
export default function TrackSheet({ item, onClose, onSeed }) {
  const { s, score, parts } = item;
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
        {s[2].map((j) => tr(model.genres[j])).join(" · ")}
        {s[5] === null ? "" : " · " + s[5] + " BPM"}
      </T>
      {score !== undefined && (
        <>
          <T>{Math.round(score * 100)}/100 de compatibilidad</T>
          <T style={st.small}>
            {Object.keys(parts).length
              ? Object.entries(parts)
                  .map(([k, v]) => k + " " + (100 * v).toFixed(1))
                  .join(" + ")
              : "Coincidencia de género."}
          </T>
        </>
      )}
      {audio[s[0]] && <Preview id={s[0]} />}
      <Button primary onPress={() => onSeed(s)}>
        Usar como perfil
      </Button>
      <Button onPress={() => open(source(s))}>Ficha del autor ↗</Button>
      {!lookup ? (
        <Button onPress={find} disabled={working}>
          {working ? "Buscando en Spotify…" : "Buscar en Spotify"}
        </Button>
      ) : (
        <>
          <T style={st.small}>
            {
              {
                matched: "Coincidencia de título y artista.",
                unconfigured:
                  "La búsqueda manual está disponible. La API de Spotify no tiene credenciales configuradas.",
                not_found: "No hubo coincidencia exacta de título y artista.",
                unavailable: "Spotify no pudo confirmar la grabación.",
              }[lookup.status]
            }
          </T>
          <Button onPress={() => open(lookup.url)}>
            {lookup.match
              ? "Abrir canción en Spotify ↗"
              : "Abrir búsqueda en Spotify ↗"}
          </Button>
        </>
      )}
      {error ? <T style={st.small}>{error}</T> : null}
    </Sheet>
  );
}
