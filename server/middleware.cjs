const { handle } = require("./api.cjs");
module.exports = async function api(req, res, next) {
  if (!req.url.split("?")[0].startsWith("/api/")) return next();
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) {
        res.writeHead(413, { "content-type": "application/json" });
        res.end('{"error":"Perfil demasiado grande"}');
        return;
      }
      chunks.push(chunk);
    }
    const response = await handle(
      new Request("http://localhost" + req.url, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : Buffer.concat(chunks),
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "content-type": "application/json" });
    res.end('{"error":"Error del servicio"}');
  }
};
