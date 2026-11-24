import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { model, byId, artist, recommend, searchTracks } from "./catalog";
import { tr, norm } from "./preferences";
import { art } from "./media";
import { api } from "./client";
import { T, Button, Input, st, c } from "./design";
import Profile, { blank } from "./Profile";
import TrackSheet from "./TrackSheet";
const navIcons = {
  Inicio: require("../assets/icons/ico-home.png"),
  Explorar: require("../assets/icons/ico-search.png"),
  Perfil: require("../assets/icons/ico-user.png"),
};
const views = ["Inicio", "Explorar", "Perfil"];
const curated = ["track_0521030", "track_0030227", "USUAN1100001"].map(
  (id) => ({ s: byId.get(id) }),
);
const sleeves = [art.window, art.rain, art.petals];
function Rows({ rows, open }) {
  return (
    <View>
      {rows.map((v, j) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={v.s[1] + " · " + artist(v.s)}
          key={v.s[0]}
          onPress={() => open({ ...v, cover: sleeves[j % 3] })}
          style={st.row}
        >
          <Image source={sleeves[j % 3]} style={st.cover} />
          <View style={{ flex: 1 }}>
            <T style={st.title} numberOfLines={1}>
              {v.s[1]}
            </T>
            <T style={st.small} numberOfLines={1}>
              {artist(v.s)}
            </T>
          </View>
          <T>→</T>
        </Pressable>
      ))}
    </View>
  );
}
function CueCrate() {
  const wide = useWindowDimensions().width >= 760,
    scroll = useRef(null),
    runId = useRef(0),
    queryId = useRef(0);
  const [view, setView] = useState("Inicio"),
    [p, setP] = useState(blank),
    [rest, setRest] = useState(false),
    [profiles, setProfiles] = useState([]),
    [item, setItem] = useState(null);
  const [rows, setRows] = useState([]),
    [heading, setHeading] = useState("Explorar"),
    [note, setNote] = useState("Elige un género o ajusta tu perfil."),
    [prob, setProb] = useState([]),
    [showMath, setMath] = useState(false),
    [applied, setApplied] = useState(null);
  const [genreQuery, setGenreQuery] = useState(""),
    [songQuery, setSongQuery] = useState(""),
    [hits, setHits] = useState([]),
    [searchNote, setSearchNote] = useState("");
  const [error, setError] = useState("");
  function navigate(v) {
    if (Platform.OS === "web" && window.location.hash !== "#" + v)
      window.location.hash = v;
    setView(v);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const sync = () => {
      const v = window.location.hash.slice(1);
      setView(views.includes(v) ? v : "Inicio");
      scroll.current?.scrollTo({ y: 0, animated: false });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (view !== "Inicio") {
        navigate("Inicio");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [view]);
  async function run(input, title = "Tus recomendaciones") {
    const id = ++runId.current;
    const profile = {
      ...blank(),
      ...input,
      bpm: input.bpm == null ? null : Number(input.bpm),
    };
    setError("");
    try {
      if (
        profile.bpm !== null &&
        (!Number.isInteger(profile.bpm) ||
          profile.bpm < 20 ||
          profile.bpm > 240)
      )
        throw Error("El tempo debe ser un entero entre 20 y 240 BPM.");
      let result;
      if (rest) {
        const body = {
          genre: model.genres[profile.g] ?? null,
          moods: profile.m.map((j) => model.moods[j]),
          instruments: profile.i.map((j) => model.instruments[j]),
          bpm: profile.bpm,
          strict: profile.strict,
          previews: profile.previews,
          seed: profile.seed,
        };
        const data = await api("/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        result = {
          ...data,
          rows: data.results.map((v) => ({
            s: byId.get(v.id),
            score: v.score,
            parts: v.parts,
          })),
        };
      } else result = recommend(profile);
      if (id !== runId.current) return;
      setRows(result.rows);
      setApplied(profile);
      setP(profile);
      setHeading(title);
      setMath(false);
      setProb(result.prob ?? []);
      setNote(
        result.status === "empty"
          ? "Elige un género o ajusta tu perfil."
          : result.status === "no_match"
            ? "Sin coincidencias. Prueba otro perfil."
            : result.rows.length +
              " recomendaciones entre " +
              result.eligible +
              " pistas · " +
              (rest ? "API REST" : "modelo local"),
      );
      setSongQuery("");
      setHits([]);
      setSearchNote("");
      queryId.current++;
      navigate("Explorar");
    } catch (e) {
      if (id === runId.current) setError(e.message);
    }
  }
  function genre(v, instrument) {
    run(
      {
        ...blank(),
        g: model.genres.indexOf(v),
        i: instrument ? [model.instruments.indexOf(instrument)] : [],
        strict: !!instrument,
      },
      tr(v),
    );
  }
  function clear() {
    runId.current++;
    setP(blank());
    setRows([]);
    setApplied(null);
    setHeading("Explorar");
    setNote("Elige un género o ajusta tu perfil.");
    setProb([]);
    setError("");
    clearSearch("");
  }
  async function search() {
    const q = songQuery.trim(),
      id = ++queryId.current;
    if (!q) {
      setHits([]);
      setSearchNote("Escribe un título o artista.");
      return;
    }
    try {
      const data = await api("/tracks?q=" + encodeURIComponent(q));
      if (id !== queryId.current) return;
      setHits(data.tracks.map((t) => ({ s: byId.get(t.id) })));
      setSearchNote(data.tracks.length + " resultados · API REST");
    } catch {
      if (id !== queryId.current) return;
      const found = searchTracks(q, null);
      setHits(found.map((s) => ({ s })));
      setSearchNote(
        found.length + " resultados · catálogo local (API no disponible)",
      );
    }
  }
  function clearSearch(text) {
    queryId.current++;
    setSongQuery(text);
    setHits([]);
    setSearchNote("");
  }
  const nav = (
    <View style={wide ? st.wrap : st.nav}>
      {views.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: view === v }}
          accessibilityLabel={v}
          onPress={() => navigate(v)}
          style={[
            st.tab,
            wide && { flexDirection: "row", gap: 5, alignItems: "center" },
          ]}
        >
          <Image
            source={navIcons[v]}
            style={{
              width: 20,
              height: 20,
              tintColor: view === v ? c.lime : c.soft,
            }}
          />
          <T
            style={{
              color: view === v ? c.lime : c.soft,
              fontWeight: "700",
              fontSize: wide ? 14 : 12,
            }}
          >
            {v}
          </T>
        </Pressable>
      ))}
    </View>
  );
  const titles = rows.length ? rows.slice(0, 3) : curated;
  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="light-content" />
      <View style={[st.frame, st.bar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="CueCrate, inicio"
          onPress={() => navigate("Inicio")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Image
              source={require("../assets/icons/logo.png")}
              style={{ width: 33, height: 28, tintColor: c.lime }}
            />
            <T style={st.logo}>CueCrate.</T>
          </View>
        </Pressable>
        {wide && nav}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Muestras sin conexión"
          style={{ padding: 10 }}
          onPress={() =>
            run(
              {
                ...blank(),
                i: [model.instruments.indexOf("Bass")],
                previews: true,
              },
              "Muestras con bajo",
            )
          }
        >
          <Image
            source={require("../assets/icons/ico-audio.png")}
            style={{ width: 25, height: 25, tintColor: c.text }}
          />
        </Pressable>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={[st.frame, { paddingTop: 14 }]}>
          {error ? (
            <T
              accessibilityRole="alert"
              style={{ color: "#ffbba9", padding: 10 }}
            >
              {error}
            </T>
          ) : null}
          {view === "Inicio" && (
            <>
              <View style={[st.hero, { minHeight: wide ? 286 : 208 }]}>
                <Image
                  source={art.concert}
                  resizeMode="cover"
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                  }}
                />
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 22,
                    paddingVertical: 20,
                  }}
                >
                  <T>Selección de CueCrate</T>
                  <T accessibilityRole="header" style={st.heroTitle}>
                    Sesión{"\n"}nocturna
                  </T>
                  <Button
                    primary
                    onPress={() =>
                      run(
                        {
                          ...blank(),
                          g: model.genres.indexOf("Ambient"),
                          m: [model.moods.indexOf("Relaxed")],
                        },
                        "Sesión nocturna",
                      )
                    }
                  >
                    ▸ Descubrir
                  </Button>
                </View>
              </View>
              <View
                style={{
                  flexDirection: wide ? "row" : "column",
                  gap: wide ? 28 : 0,
                }}
              >
                <View style={[st.section, { flex: 1 }]}>
                  <View style={st.between}>
                    <T style={st.h2}>Explorar géneros</T>
                    <Button
                      onPress={() => {
                        setGenreQuery("");
                        navigate("Explorar");
                      }}
                    >
                      Ver todos
                    </Button>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      ["Hip Hop", "Bass", art.hiphop],
                      ["Jazz", "Piano", art.jazz],
                      ["Rock", "Guitar", art.rock],
                    ].map(([v, i, src]) => (
                      <Pressable
                        key={v}
                        accessibilityRole="button"
                        accessibilityLabel={v}
                        onPress={() => genre(v, i)}
                        style={{
                          flex: 1,
                          aspectRatio: 1,
                          borderRadius: 10,
                          overflow: "hidden",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Image
                          source={src}
                          style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <T
                          style={{
                            fontWeight: "800",
                            fontSize: 20,
                            padding: 8,
                            backgroundColor: "#130c1966",
                          }}
                        >
                          {v}
                        </T>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={[st.section, { flex: 1 }]}>
                  <T style={st.h2}>{rows.length ? "Para ti" : "En rotación"}</T>
                  <Rows rows={titles} open={setItem} />
                </View>
              </View>
            </>
          )}
          {view === "Explorar" && (
            <View style={{ gap: 12 }}>
              <T accessibilityRole="header" style={st.h1}>
                {heading}
              </T>
              <T style={st.small}>{note}</T>
              <Button onPress={() => navigate("Perfil")}>Ajustar perfil</Button>
              <Rows rows={rows} open={setItem} />
              {rows.length > 0 && (
                <Button onPress={() => setMath(!showMath)}>
                  Cómo se calculó
                </Button>
              )}
              {showMath && (
                <T style={st.small}>
                  La puntuación combina las coincidencias de ánimo, instrumentos
                  y tempo con el modelo de género.{" "}
                  {prob.length > 0
                    ? prob
                        .map((v, j) => [v, j])
                        .sort((a, b) => b[0] - a[0])
                        .slice(0, 3)
                        .map(
                          ([v, j]) =>
                            tr(model.genres[j]) +
                            " " +
                            (v * 100).toFixed(1) +
                            "%",
                        )
                        .join(" · ")
                    : ""}
                </T>
              )}
              <T style={st.h2}>Buscar canciones</T>
              <Input
                accessibilityLabel="Título o artista"
                placeholder="Título o artista"
                value={songQuery}
                onChangeText={clearSearch}
                onSubmitEditing={search}
                maxLength={180}
              />
              <Button onPress={search}>Buscar en el catálogo</Button>
              {searchNote ? <T style={st.small}>{searchNote}</T> : null}
              <Rows rows={hits} open={setItem} />
              <T style={st.h2}>Todos los géneros</T>
              <Input
                accessibilityLabel="Buscar género"
                placeholder="Buscar género…"
                value={genreQuery}
                onChangeText={setGenreQuery}
              />
              <View style={st.wrap}>
                {model.genres
                  .filter((v) =>
                    [v, tr(v)].some((n) => norm(n).includes(norm(genreQuery))),
                  )
                  .map((v) => (
                    <Button
                      key={v}
                      onPress={() => genre(v)}
                      selected={applied?.g === model.genres.indexOf(v)}
                    >
                      {tr(v)}
                    </Button>
                  ))}
              </View>
            </View>
          )}
          {view === "Perfil" && (
            <Profile
              p={p}
              setP={setP}
              run={run}
              clear={clear}
              useRest={rest}
              setUseRest={setRest}
              profiles={profiles}
              setProfiles={setProfiles}
            />
          )}
        </View>
      </ScrollView>
      {!wide && nav}
      {item && (
        <TrackSheet
          key={item.s[0]}
          item={item}
          onClose={() => setItem(null)}
          onSeed={(s) => {
            setItem(null);
            run(
              {
                ...blank(),
                g: item.score !== undefined ? (applied?.g ?? null) : null,
                m: s[3],
                i: s[4],
                bpm: s[5],
                seed: s[0],
                previews:
                  item.score !== undefined && (applied?.previews ?? false),
              },
              "Pistas similares",
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <CueCrate />
    </SafeAreaProvider>
  );
}
