/**
 * @typedef {import("node:fs").PathLike} PathLike
 * @typedef {import('http-proxy-middleware').Options} ProxyOptions
 * @typedef {import('http-proxy-middleware').RequestHandler} RequestHandler
 */
import express from "express";
import { Agent, createServer } from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const socketPath = path.resolve(process.argv[2] || process.env.RELOPROXY_SOCK || "./reloproxy.sock"); 
const config = JSON.parse(readFileSync(path.join(__dirname, "config.json")));

/**
 * @param {PathLike} path 
 * @param {PathLike} socketPath 
 * @param {ProxyOptions} [extras]
 * @returns {RequestHandler}
 */
function unixSocketMiddleWare(path, socketPath, extras={changeOrigin: true,target: "http://localhost"}) {
  return createProxyMiddleware({
    ...extras,
    pathFilter: p => path.join(path, p),
    agent: new (class extends Agent {
      createConnection(_, callback) {
        return net.createConnection(socketPath, callback);
      }
    })(),
    onError(_, __, res) {
      res.status(502).send("Bad Gateway");
    },
  });
}

config?.proxy_paths?.forEach(p => {
  if (!p.socket || !p.paths) return;
  if (!p.target) p.target = "http://localhost";

  p.paths.forEach(proxypath => {
    app.use(
      proxypath,
      unixSocketMiddleWare(proxypath, path.resolve(__dirname, p.socket), p)
    );
  });
});

Object.entries(config?.events || {}).forEach(([event, { init, on }]) => {
  if (init) eval(init);
  if (on) app.on(event, eval(on));
});


app.use(
  createProxyMiddleware({
    target: "http://localhost",
    changeOrigin: true,
    agent: new (class extends Agent {
      createConnection(_, cb) {
        return net.createConnection(socketPath, cb);
      }
    })(),
    logLevel: "debug",
    onError(_, __, res) {
      res.status(502).send("Bad Gateway");
    },
  })
);

const server = createServer((req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  app(req, res);
});

let port = parseInt(process.env.PORT || "", 10);
if (isNaN(port)) port = 8080;

server.listen(port, onListening);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function onListening() {
  const address = server.address();
  if (address && typeof address === "object") {
    console.log(`Listening on: http://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`);
  }
}

function shutdown() {
  console.log("Shutting down...");
  server.close(() => process.exit(0)); 
}