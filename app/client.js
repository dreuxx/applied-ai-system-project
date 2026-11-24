import { Platform } from "react-native";
const origin = (
  Platform.OS === "web"
    ? window.location.origin
    : process.env.EXPO_PUBLIC_API_ORIGIN || ""
).replace(/\/$/, "");
export async function api(path, options = {}) {
  if (!origin)
    throw Error(
      "Para usar REST en el teléfono configura EXPO_PUBLIC_API_ORIGIN con la dirección de tu PC.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let r;
    try {
      r = await fetch(origin + "/api" + path, {
        ...options,
        signal: controller.signal,
      });
    } catch {
      throw Error("La API REST no está disponible. Comprueba la conexión.");
    }
    if (!r.headers.get("content-type")?.includes("application/json"))
      throw Error("No se encontró la API REST en esta dirección.");
    const body = await r.json();
    if (!r.ok) throw Error(body.error || "Error de la API");
    return body;
  } finally {
    clearTimeout(timer);
  }
}
