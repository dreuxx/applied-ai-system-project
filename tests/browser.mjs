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
  const view = (id) => p.locator('nav [data-view="' + id + '"]').click();
  const first = () => p.locator("#list .trackRow").first();
  const profileCSV = fileURLToPath(
    new URL("../data/preferencias.csv", import.meta.url),
  );
  await p.goto(new URL("../CueCrate_Movil.html", import.meta.url).href);
  ok(
    (await p.locator("#home").isVisible()) &&
      (await p.locator("#homeTracks button").count()) === 3,
    "editorial home with real tracks",
  );
  ok(
    await p
      .locator("#home img")
      .evaluateAll((imgs) =>
        imgs.every((i) => i.complete && i.naturalWidth > 0),
      ),
    "seven offline images decoded",
  );
  if (process.env.SCREENSHOT_DIR)
    await p.screenshot({ path: process.env.SCREENSHOT_DIR + "/mobile.png" });
  await p.locator("#discover").click();
  ok(
    (await p.locator("#heading").innerText()) === "Sesión nocturna" &&
      (await p.locator("#list button").count()) > 0,
    "hero opens a ranked session",
  );
  await view("home");
  await p.locator("#preset").click();
  ok((await first().innerText()).includes("Big Plans Remix"), "hip hop tile");
  ok((await p.locator("#list button").count()) === 5, "five recommendations");
  await p.locator("#explain summary").click();
  ok(
    (await p.locator("#math").innerText()).includes("%"),
    "classifier visible",
  );
  await first().click();
  ok(
    (await p.locator("#trackDialog").isVisible()) &&
      (await p.locator("#trackContent .artist").innerText()) === "Kellee Maize",
    "credited artist in track sheet",
  );
  await p.locator("#trackContent summary").click();
  ok(
    (await p.locator("#trackContent details").innerText()).includes(
      "instrumentos",
    ),
    "score breakdown",
  );
  ok(
    (await p.locator("#trackContent a").getAttribute("href")).startsWith(
      "https://www.jamendo.com/track/",
    ),
    "Jamendo source link",
  );
  await p.locator("#dismiss").click();
  await view("profile");
  await p.locator("form summary").click();
  await p.locator("#file").setInputFiles(profileCSV);
  await p.locator("#imported").waitFor();
  ok(
    (await p.locator("#saved option").count()) === 7,
    "seven local CSV profiles",
  );
  for (const [idx, title] of [
    ["6", "Condition Humaine"],
    ["1", "Neolith"],
    ["3", "C-Funk"],
  ]) {
    await p.locator("#saved").selectOption(idx);
    await p.locator("#apply").click();
    ok((await first().innerText()).includes(title), "CSV recommends " + title);
    if (idx !== "3") await view("profile");
  }
  await first().click();
  const media = p.locator("#trackContent audio");
  await media.evaluate(async (a) => {
    a.muted = true;
    await a.play();
  });
  await p.waitForFunction(
    () => document.querySelector("dialog audio")?.currentTime > 0.1,
  );
  ok(
    await media.evaluate((a) => a.duration > 6 && a.duration < 8),
    "local audio playback",
  );
  await p.getByText("Usar como perfil", { exact: true }).click();
  ok(
    !(await p.locator("#list").innerText()).includes("C-Funk"),
    "seed exclusion",
  );
  await view("profile");
  await p
    .locator("#file")
    .setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("bad\nx"),
    });
  await p.waitForFunction(() =>
    document.querySelector("#csvStatus").textContent.includes("encabezado"),
  );
  ok(!(await p.locator("#imported").isVisible()), "invalid CSV handled");
  await p.locator("#reset").click();
  await view("home");
  ok(
    (await p.locator("#homeTitle").innerText()) === "En rotación",
    "reset restores editorial home",
  );
  await p.locator("#allGenres").click();
  ok(
    (await p.locator("#genreBrowser button").count()) === 103,
    "full genre browser",
  );
  await p.locator("#genreSearch").fill("reggae");
  await p.locator("#genreBrowser button").click();
  ok(
    (await p.locator("#heading").innerText()) === "Reggae",
    "genre search applies filter",
  );
  await p.locator("#listenable").click();
  await first().click();
  ok((await p.locator("dialog audio").count()) === 1, "headphones shortcut");
  await p.keyboard.press("Escape");
  ok(!(await p.locator("#trackDialog").isVisible()), "keyboard dismiss");
  await view("profile");
  await p.locator("#reset").click();
  await view("home");
  for (const w of [320, 390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 844 });
    for (const id of ["home", "explore", "profile"]) {
      await view(id);
      ok(
        await p.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        "layout " + id + " " + w,
      );
    }
  }
  await view("home");
  if (process.env.SCREENSHOT_DIR)
    await p.screenshot({ path: process.env.SCREENSHOT_DIR + "/desktop.png" });
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
