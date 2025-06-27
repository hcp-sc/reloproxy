import express from "express";
import { Agent, createServer } from "node:http";
import { hostname } from "node:os";
import { createProxyMiddleware } from "http-proxy-middleware";
import net from "node:net";
import { resolve } from "node:path";


const app = express();

const socketPath = resolve(process.argv[2] || process.env.RELOPROXY_SOCK || "./reloproxy.sock"); 
const uvSockPath = resolve(process.argv[3] || process.env.UV_SOCK || "./uv.sock");

function proxyToUnixSocket(path, socketPath) {
  return app.use(path,createProxyMiddleware({
    target: "http://localhost",
    changeOrigin: true,
    logLevel: "debug",
    agent: new (class extends Agent {
      createConnection(_, callback) {
        return net.createConnection(socketPath, callback);
      }
    })(),
    onError(_, _, res) {
      res.status(502).send("Bad Gateway");
    },
  }));
}

app.use("/uv", (req, res, next) => {
  console.log("Incoming request to /uv:", req.method, req.url);
  next();
});

proxyToUnixSocket("/", uvSockPath);

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
    onError(_, _, res) {
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