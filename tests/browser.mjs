import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_PATH || "playwright");
const launch = {};
if (process.env.CHROMIUM_PACKAGE) {
  const packaged = (await import(process.env.CHROMIUM_PACKAGE)).default;
  launch.args = packaged.args;
  launch.executablePath = await packaged.executablePath();
}
const b = await pw.chromium.launch(launch);
try {
  const ctx = await b.newContext({
      offline: true,
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    }),
    p = await ctx.newPage(),
    network = [],
    errors = [],
    checks = [];
  p.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  p.on("pageerror", (e) => errors.push(e.message));
  const ok = (v, msg) => {
    assert.ok(v, msg);
    checks.push(msg);
  };
  await p.goto(new URL("../CueCrate_Movil.html", import.meta.url).href);
  ok((await p.locator("article").count()) === 0, "empty profile");
  await p.locator("#preset").click();
  ok(
    (await p.locator("article h3").first().innerText()) === "Big Plans Remix",
    "hip hop profile",
  );
  ok((await p.locator("article").count()) === 5, "five results");
  await p.locator("#explain summary").click();
  ok(
    (await p.locator("#math").innerText()).includes("%"),
    "classifier output visible",
  );
  await p.locator("form summary").click();
  await p
    .locator("#file")
    .setInputFiles(
      fileURLToPath(new URL("../data/preferencias.csv", import.meta.url)),
    );
  await p.locator("#imported").waitFor();
  ok((await p.locator("#saved option").count()) === 7, "local CSV import");
  ok(
    (await p.locator("article").first().innerText()).includes("Kellee Maize"),
    "correct Jamendo artist",
  );
  ok(
    (await p.locator("article a").first().getAttribute("href")).startsWith(
      "https://www.jamendo.com/track/",
    ),
    "Jamendo source URL",
  );
  await p.locator("#saved").selectOption("6");
  await p.locator("#apply").click();
  ok(
    (await p.locator("article").first().innerText()).includes("Le Zaarth"),
    "multi-artist CSV profile",
  );
  await p.locator("#saved").selectOption("1");
  await p.locator("#apply").click();
  ok(
    (await p.locator("article h3").first().innerText()) === "Neolith",
    "rock profile changes first result",
  );
  await p.locator("#saved").selectOption("3");
  await p.locator("#apply").click();
  const audio = p.locator("audio").first();
  await audio.evaluate(async (a) => {
    a.muted = true;
    await a.play();
  });
  await p.waitForFunction(
    () => document.querySelector("audio")?.currentTime > 0.15,
  );
  ok(
    await audio.evaluate((a) => a.duration > 6 && a.duration < 8),
    "offline audio plays",
  );
  await p.getByText("Usar como perfil", { exact: true }).first().click();
  ok(
    !(await p.locator("article h3").allInnerTexts()).includes("C-Funk"),
    "seed excluded",
  );
  await p.locator("#file").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("bad\nx"),
  });
  await p.waitForFunction(() =>
    document.querySelector("#csvStatus").textContent.includes("encabezado"),
  );
  ok(!(await p.locator("#imported").isVisible()), "invalid CSV");
  await p.locator("#reset").click();
  ok((await p.locator("article").count()) === 0, "reset");
  await p.locator("#preset").click();
  for (const w of [320, 390, 768]) {
    await p.setViewportSize({ width: w, height: 844 });
    ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "layout " + w,
    );
  }
  ok(network.length === 0, "zero network requests");
  ok(errors.length === 0, "zero JS errors");
  console.log(
    JSON.stringify(
      {
        browser: b.version(),
        mode: "file:// offline, touch emulation",
        checks,
        network,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await b.close();
}
