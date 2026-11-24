const { getDefaultConfig } = require("expo/metro-config");
const api = require("./server/middleware.cjs");
const config = getDefaultConfig(__dirname);
const original = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const inner = original ? original(middleware, server) : middleware;
  // Metro hands requests it cannot serve (such as /favicon.ico) to next.
  return (req, res, next) => api(req, res, () => inner(req, res, next));
};
module.exports = config;
