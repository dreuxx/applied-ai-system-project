const { handle } = require("./api.cjs");
const { message, pick } = require("../app/i18n");
module.exports = async function api(req, res, next) {
  if (!req.url.split("?")[0].startsWith("/api/")) return next();
  const fail = (status, text) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        error: message(pick(req.headers["accept-language"]), text),
      }),
    );
  };
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) return fail(413, "Perfil demasiado grande");
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
    fail(500, "Error del servicio");
  }
};
