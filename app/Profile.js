import React, { useState } from "react";
import { View, Switch, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { model } from "./catalog";
import { parseCSV, tr, norm } from "./preferences";
import { useLang } from "./lang";
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
  g: model.genres,
  m: model.moods,
  i: model.instruments,
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
  const { lang, choose, t, label, message } = useLang();
  const [field, setField] = useState(null),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  function change(k, v) {
    setP({ ...p, [k]: v, seed: null });
  }
  async function importCSV() {
    setNotice("");
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
      setNotice(e.message);
    }
  }
  return (
    <View style={st.section}>
      <T style={st.h1}>{t("profileTitle")}</T>
      <View style={st.between}>
        <T style={{ flex: 1 }}>{t("language")}</T>
        <View style={st.wrap}>
          {[
            ["es", "Español"],
            ["en", "English"],
          ].map(([code, name]) => (
            <Button
              key={code}
              selected={lang === code}
              onPress={() => choose(code)}
            >
              {name}
            </Button>
          ))}
        </View>
      </View>
      {Object.entries(fields).map(([k, labels]) => (
        <View key={k} style={{ gap: 6 }}>
          <T>{t("field." + k)}</T>
          <Button
            label={t("chooseLabel." + k)}
            onPress={() => {
              setField(k);
              setQuery("");
            }}
          >
            {k === "g"
              ? p.g === null
                ? t("anyGenre")
                : label(labels[p.g])
              : p[k].length
                ? p[k].map((j) => label(labels[j])).join(" · ")
                : t("choose." + k)}
          </Button>
        </View>
      ))}
      <T>{t("tempo")}</T>
      <Input
        accessibilityLabel={t("tempoLabel")}
        keyboardType="number-pad"
        placeholder={t("anyTempo")}
        value={String(p.bpm ?? "")}
        onChangeText={(v) => change("bpm", v === "" ? null : v)}
      />
      <T style={st.small}>{t("tempoHelp")}</T>
      {[
        [p.strict, (v) => change("strict", v), "strict"],
        [p.previews, (v) => change("previews", v), "previews"],
        [useRest, setUseRest, "useRest"],
      ].map(([value, fn, name]) => (
        <View key={name} style={st.between}>
          <T style={{ flex: 1 }}>{t(name)}</T>
          <Switch
            accessibilityLabel={t(name)}
            value={value}
            onValueChange={fn}
            trackColor={{ true: c.lime, false: c.line }}
          />
        </View>
      ))}
      <T style={st.small}>{t(useRest ? "restOn" : "restOff")}</T>
      <View style={st.wrap}>
        <Button primary onPress={() => run(p)}>
          {t("recommend")}
        </Button>
        <Button
          onPress={() => {
            clear();
            setNotice("Perfil borrado.");
          }}
        >
          {t("clear")}
        </Button>
      </View>
      <Button onPress={importCSV}>{t("importCsv")}</Button>
      {profiles.map((row, j) => (
        <Button
          key={j}
          onPress={() => run({ ...blank(), ...row }, { text: row.name })}
        >
          {row.name}
        </Button>
      ))}
      {notice ? <T>{message(notice)}</T> : null}
      <T style={st.small}>{t("credits")}</T>
      {field && (
        <Sheet title={t("field." + field)} onClose={() => setField(null)}>
          <Input
            accessibilityLabel={t("filter")}
            placeholder={t("filterHint")}
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
                {t("anyGenre")}
              </Button>
            )}
            {fields[field]
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
                  {label(v)}
                </Button>
              ))}
          </View>
          <Button primary onPress={() => setField(null)}>
            {t("done")}
          </Button>
        </Sheet>
      )}
    </View>
  );
}
