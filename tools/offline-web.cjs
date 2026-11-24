// Cache the exported web application, including the model and all local audio excerpts.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "../dist"),
  ignored = new Set(["sw.js", "register-worker.js"]);
function tree(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const file = path.join(dir, e.name);
    return e.isDirectory()
      ? tree(file)
      : [path.relative(root, file).split(path.sep).join("/")];
  });
}
const index = path.join(root, "index.html");
const registration = '<script defer src="/register-worker.js"></script>';
let html = fs.readFileSync(index, "utf8");
if (!html.includes(registration))
  fs.writeFileSync(index, html.replace("</head>", registration + "</head>"));
const files = tree(root)
  .filter((name) => !ignored.has(name))
  .sort();
const hash = crypto.createHash("sha256");
for (const name of files)
  hash.update(name).update(fs.readFileSync(path.join(root, name)));
const cache = "cuecrate-web-" + hash.digest("hex").slice(0, 16);
fs.writeFileSync(
  path.join(root, "register-worker.js"),
  `
if ("serviceWorker" in navigator) window.addEventListener("load", () => {
  navigator.serviceWorker.register("/sw.js").catch(error => console.warn("CueCrate offline:",error.message));
});`,
);
fs.writeFileSync(
  path.join(root, "sw.js"),
  `
const name=${JSON.stringify(cache)}, assets=new Set(${JSON.stringify([...files.map((n) => "/" + n), "/register-worker.js"])});
self.addEventListener("install",event=>event.waitUntil(caches.open(name).then(cache=>cache.addAll([...assets]))));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith("cuecrate-web-")&&key!==name)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  const key=url.pathname==="/"?"/index.html":url.pathname;
  if(!assets.has(key))return;
  event.respondWith((async()=>{
    const cached=await (await caches.open(name)).match(key);
    if(!cached)return fetch(event.request);
    const range=event.request.headers.get("Range");
    if(!range)return cached;
    const m=/^bytes=(\\d+)-(\\d*)$/.exec(range);
    if(!m)return fetch(event.request);
    const body=await cached.arrayBuffer(),start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),body.byteLength-1):body.byteLength-1;
    if(start>end)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+body.byteLength}});
    return new Response(body.slice(start,end+1),{status:206,headers:{"Content-Type":cached.headers.get("Content-Type")||"application/octet-stream","Accept-Ranges":"bytes","Content-Range":"bytes "+start+"-"+end+"/"+body.byteLength}});
  })());
});`,
);
console.log("Offline cache:", files.length + 1, "assets");
