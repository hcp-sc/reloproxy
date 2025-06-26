import express from "express";
import { Agent, createServer } from "node:http";
// import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
// import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
// import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import { createProxyMiddleware } from "http-proxy-middleware";
import net from "node:net";
import { resolve } from "node:path";


const app = express();

app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

const socketPath = resolve(process.argv[2] || process.env.RELOPROXY_SOCK || "./reloproxy.sock"); 

app.use(
  createProxyMiddleware({
    target: "http://unixsocket",
    changeOrigin: true,
    agent: new (class extends Agent {
      createConnection(_, cb) {
        return net.createConnection(socketPath, cb);
      }
    })(),
    logLevel: "warn",
    onError(err, req, res) {
      console.error("Proxy error:", err);
      res.status(502).send("Bad Gateway");
    },
  })
);

const server = createServer((req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

let port = parseInt(process.env.PORT || "", 10);
if (isNaN(port)) port = 8080;

server.listen(port, onListening);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function onListening() {
  const address = server.address();
  if (address && typeof address === "object") {
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
    console.log(
      `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`
    );
  }
}

function shutdown() {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
}