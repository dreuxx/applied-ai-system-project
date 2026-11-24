import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import { languages, t, label, message } from "./i18n";
const key = "cuecrate.lang";
// Web: ?lang=en, then the saved choice. Spanish otherwise.
function initial() {
  if (Platform.OS !== "web") return "es";
  try {
    const asked = new URLSearchParams(window.location.search).get("lang");
    if (languages.includes(asked)) return asked;
    const saved = window.localStorage.getItem(key);
    if (languages.includes(saved)) return saved;
  } catch {}
  return "es";
}
const Language = createContext(null);
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(initial);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(key, lang);
    } catch {}
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      choose(next) {
        if (!languages.includes(next)) return;
        if (Platform.OS === "web") {
          // A ?lang= link should not override a later choice on reload.
          const url = new URL(window.location.href);
          if (url.searchParams.has("lang")) {
            url.searchParams.delete("lang");
            window.history.replaceState(null, "", url);
          }
        }
        setLang(next);
      },
      t: (name, values) => t(lang, name, values),
      label: (name) => label(lang, name),
      message: (text) => message(lang, text),
    }),
    [lang],
  );
  return <Language.Provider value={value}>{children}</Language.Provider>;
}
export const useLang = () => useContext(Language);
