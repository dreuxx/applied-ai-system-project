const { getDefaultConfig } = require("expo/metro-config");
const api = require("./server/middleware.cjs");
const config = getDefaultConfig(__dirname);
const original = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = original ? original(middleware, server) : middleware;
  return (req, res) => api(req, res, () => next(req, res));
};
module.exports = config;
