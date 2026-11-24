import React, { useState } from "react";
import { View, Switch, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { model } from "./catalog";
import { parseCSV, tr, norm } from "./preferences";
import { T, Button, Input, Sheet, st, c } from "./design";
export const blank = () => ({
  g: null,
  m: [],
  i: [],
  bpm: null,
  strict: false,
  previews: false,
  seed: null,
});
const fields = {
  g: ["Género", model.genres],
  m: ["Ánimo", model.moods],
  i: ["Instrumentos", model.instruments],
};
export default function Profile({
  p,
  setP,
  run,
  clear,
  useRest,
  setUseRest,
  profiles,
  setProfiles,
}) {
  const [field, setField] = useState(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  function change(k, v) {
    setP({ ...p, [k]: v, seed: null });
  }
  async function importCSV() {
    setMessage("");
    try {
      const f = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (f.canceled) return;
      const a = f.assets[0];
      if ((a.size ?? 0) > 131072) throw Error("Máximo 128 KiB.");
      const text =
        Platform.OS === "web"
          ? await a.file.text()
          : await new File(a.uri).text();
      if (text.length > 131072) throw Error("Máximo 128 KiB.");
      setProfiles(parseCSV(text));
    } catch (e) {
      setProfiles([]);
      setMessage(e.message);
    }
  }
  return (
    <View style={st.section}>
      <T style={st.h1}>Tu perfil musical</T>
      {Object.entries(fields).map(([k, [name, labels]]) => (
        <View key={k} style={{ gap: 6 }}>
          <T>{name}</T>
          <Button
            label={"Elegir " + name}
            onPress={() => {
              setField(k);
              setQuery("");
            }}
          >
            {k === "g"
              ? p.g === null
                ? "Cualquier género"
                : tr(labels[p.g])
              : p[k].length
                ? p[k].map((j) => tr(labels[j])).join(" · ")
                : "Elegir " + name.toLowerCase()}
          </Button>
        </View>
      ))}
      <T>Tempo opcional (BPM)</T>
      <Input
        accessibilityLabel="Tempo opcional"
        keyboardType="number-pad"
        placeholder="Cualquier tempo"
        value={String(p.bpm ?? "")}
        onChangeText={(v) => change("bpm", v === "" ? null : v)}
      />
      <T style={st.small}>
        Solo las pistas con BPM conocidos pueden coincidir con un tempo.
      </T>
      {[
        [p.strict, (v) => change("strict", v), "Exigir todas las etiquetas"],
        [p.previews, (v) => change("previews", v), "Solo con muestra"],
        [useRest, setUseRest, "Calcular este perfil con la API REST"],
      ].map(([value, fn, label]) => (
        <View key={label} style={st.between}>
          <T style={{ flex: 1 }}>{label}</T>
          <Switch
            accessibilityLabel={label}
            value={value}
            onValueChange={fn}
            trackColor={{ true: c.lime, false: c.line }}
          />
        </View>
      ))}
      <T style={st.small}>
        {useRest
          ? "Al recomendar se envían las preferencias al servidor configurado."
          : "El modelo calcula tu perfil en este dispositivo."}
      </T>
      <View style={st.wrap}>
        <Button primary onPress={() => run(p)}>
          Recomendar música
        </Button>
        <Button
          onPress={() => {
            clear();
            setMessage("Perfil borrado.");
          }}
        >
          Borrar perfil
        </Button>
      </View>
      <Button onPress={importCSV}>Importar preferencias CSV</Button>
      {profiles.map((row, j) => (
        <Button key={j} onPress={() => run({ ...blank(), ...row }, row.name)}>
          {row.name}
        </Button>
      ))}
      {message ? <T>{message}</T> : null}
      <T style={st.small}>
        Catálogo de MTG-Jamendo (CC BY-NC-SA 4.0) e Incompetech. Muestras de
        Kevin MacLeod (CC BY 4.0). Arte editorial de CueCrate.
      </T>
      {field && (
        <Sheet title={fields[field][0]} onClose={() => setField(null)}>
          <Input
            accessibilityLabel="Filtrar opciones"
            placeholder="Filtrar opciones…"
            value={query}
            onChangeText={setQuery}
          />
          <View style={st.wrap}>
            {field === "g" && (
              <Button
                onPress={() => {
                  change("g", null);
                  setField(null);
                }}
              >
                Cualquier género
              </Button>
            )}
            {fields[field][1]
              .map((v, j) => ({ v, j }))
              .filter(({ v }) =>
                [tr(v), v].some((x) => norm(x).includes(norm(query))),
              )
              .map(({ v, j }) => (
                <Button
                  key={j}
                  selected={field === "g" ? p.g === j : p[field].includes(j)}
                  onPress={() => {
                    if (field === "g") {
                      change("g", j);
                      setField(null);
                    } else
                      change(
                        field,
                        p[field].includes(j)
                          ? p[field].filter((x) => x !== j)
                          : [...p[field], j],
                      );
                  }}
                >
                  {tr(v)}
                </Button>
              ))}
          </View>
          <Button primary onPress={() => setField(null)}>
            Listo
          </Button>
        </Sheet>
      )}
    </View>
  );
}
