import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  pw = require(process.env.PLAYWRIGHT_PATH || "playwright");
const dev = process.argv.includes("--dev"),
  port = dev ? 8081 : 3001,
  base = "http://127.0.0.1:" + port;
const cwd = fileURLToPath(new URL("../", import.meta.url));
const proc = spawn(
  process.execPath,
  dev
    ? [
        fileURLToPath(new URL("../node_modules/expo/bin/cli", import.meta.url)),
        "start",
        "--web",
        "--localhost",
        "--port",
        String(port),
        "--max-workers",
        "2",
      ]
    : ["server/local.cjs", "--preview"],
  {
    cwd,
    env: {
      ...process.env,
      CI: "1",
      EXPO_NO_TELEMETRY: "1",
      PORT: String(port),
      SPOTIFY_CLIENT_ID: "",
      SPOTIFY_CLIENT_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
for (const stream of [proc.stdout, proc.stderr])
  stream.on("data", (s) => {
    logs = (logs + s).slice(-7000);
  });
let browser;
try {
  let healthy = false;
  for (let n = 0; n < 160; n++) {
    if (proc.exitCode !== null) throw Error("Server stopped: " + logs);
    try {
      const response = await fetch(base + "/api/health");
      healthy = (await response.json()).tracks === 56656;
    } catch {}
    if (healthy) break;
    await wait(250);
  }
  assert(healthy, "REST service did not start: " + logs);
  const opts = {};
  if (process.env.CHROMIUM_PACKAGE) {
    const binary = (await import(process.env.CHROMIUM_PACKAGE)).default;
    opts.executablePath = await binary.executablePath();
    opts.args = binary.args;
  }
  browser = await pw.chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const btn = (name) => page.getByRole("button", { name, exact: true });
  await page.goto(base, { timeout: 120000 });
  await btn("Hip Hop").waitFor({ timeout: 90000 });
  if (process.env.CUECRATE_SCREENSHOT)
    await page.screenshot({ path: process.env.CUECRATE_SCREENSHOT });
  await btn("Hip Hop").click();
  await btn("Big Plans Remix · Kellee Maize").first().click();
  await btn("Buscar en Spotify").click();
  await btn("Abrir búsqueda en Spotify ↗").waitFor();
  await btn("Cerrar").click();
  await page
    .getByLabel("Título o artista", { exact: true })
    .fill("Big Plans Remix");
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/tracks?q=")),
    btn("Buscar en el catálogo").click(),
  ]);
  assert.equal(res.status(), 200);
  await btn("Perfil").click();
  await page
    .getByRole("switch", { name: "Calcular este perfil con la API REST" })
    .click();
  const [post] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/recommendations")),
    btn("Recomendar música").click(),
  ]);
  assert.equal((await post.json()).results[0].title, "Big Plans Remix");
  await btn("Perfil").click();
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    btn("Importar preferencias CSV").click(),
  ]);
  await picker.setFiles(
    fileURLToPath(new URL("../data/preferencias.csv", import.meta.url)),
  );
  await btn("Reggae con guitarra").click();
  await btn("Condition Humaine · Le Zaarth").waitFor();
  await btn("Muestras sin conexión").click();
  await page.getByText("Muestras con bajo", { exact: true }).waitFor();

  // All sample rows contain a right-arrow; open the first visible recording.
  await page.getByText("→", { exact: true }).first().click();
  await btn("Reproducir muestra · 7 s").click();
  await btn("Pausar muestra").waitFor();
  await btn("Cerrar").click();
  await btn("Inicio").click();
  await page.getByText("Para ti", { exact: true }).waitFor();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  // The whole interface switches to English, keeps the choice and switches back.
  await btn("Cambiar idioma a inglés").click();
  await btn("Home").waitFor();
  await page.getByText("For you", { exact: true }).waitFor();
  await btn("Profile").click();
  await btn("Choose mood").waitFor();
  await page.reload({ timeout: 120000 });
  await btn("Recommend music").waitFor({ timeout: 90000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");
  await btn("Switch language to Spanish").click();
  await btn("Recomendar música").waitFor();
  await page.goto(base + "/?lang=en#Perfil", { timeout: 120000 });
  await btn("Recommend music").waitFor({ timeout: 90000 });
  await btn("Español").click();
  await btn("Recomendar música").waitFor();
  assert(!page.url().includes("lang="));
  await btn("Inicio").click();
  if (!dev) {
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker?.controller),
    );
    await page.context().setOffline(true);
    await page.reload();
    await btn("Hip Hop").click();
    await btn("Big Plans Remix · Kellee Maize").first().waitFor();
    await page
      .getByLabel("Título o artista", { exact: true })
      .fill("Kellee Maize");
    await btn("Buscar en el catálogo").click();
    await page.getByText(/catálogo local \(API no disponible\)/).waitFor();
    await btn("Muestras sin conexión").click();
    await page.getByText("→", { exact: true }).first().click();
    await btn("Reproducir muestra · 7 s").click();
    await btn("Pausar muestra").waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        server: dev ? "npx expo start --web" : "production preview",
        health: 56656,
        checks: [
          "home genre",
          "track details",
          "Spotify without keys",
          "REST search",
          "REST ranking",
          "CSV import",
          "local audio playback",
          "personalized home",
          "responsive widths 320/390/1280",
          "Spanish/English switch, saved choice and ?lang=en",
        ],
        offlineReloadSearchAndAudio: !dev,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(logs);
  throw e;
} finally {
  await browser?.close();
  proc.kill();
}
