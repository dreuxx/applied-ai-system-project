const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const middleware = require("./middleware.cjs");
const dist = path.resolve(__dirname, "../dist"),
  preview = process.argv.includes("--preview");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};
if (preview && !fs.existsSync(path.join(dist, "index.html")))
  throw Error("Ejecuta npm run build antes de npm run preview");
const server = http.createServer((req, res) =>
  middleware(req, res, () => {
    if (!preview || req.method !== "GET") {
      res.writeHead(404);
      return res.end();
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      return res.end();
    }
    const file = path.resolve(
      dist,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (
      !file.startsWith(dist + path.sep) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file)
      .on("error", () => res.destroy())
      .pipe(res);
  }),
);
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3001);
server.listen(port, host, () =>
  console.log("CueCrate: http://" + host + ":" + server.address().port),
);
