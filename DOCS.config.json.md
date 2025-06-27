The config.json is configured like this, with comments:
```jsonc
{
  "proxy_paths": [ // these paths will be proxied respectively
    {
      "socket": "uv.sock", // the unix socket
      "paths": ["/uv/", "/epoxy/", "/baremux/"], // these are the paths they serve under
      "target": "http://localhost", // useless, but needed
      // other non things that get passed to createProxyMiddleware
    }
  ],
  "events": {
    // app.on(...)
    "upgrade": {
      // run this when config.json is loaded
      "init": "globalThis.wispMiddleware=unixSocketMiddleWare(\"/\", \"path.resolve(__dirname, \"uv.sock\")\")",
      "on": "globalThis.wispMiddleware" // a statement to return a function, could be like ()=>{}, etc. basically app.on('...', eval(thatcode))
    }
  }
}
```