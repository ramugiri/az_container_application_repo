const http = require("node:http");

const port = Number(process.env.PORT) || 8080;
const version = process.env.APP_VERSION || "local";

function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", version }));
  }

  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>MCM</title></head>
<body style="font-family: system-ui, sans-serif; margin: 3rem;">
  <h1>Mobile Construction Management</h1>
  <p>Running on Azure Container Apps.</p>
  <p>Version: <code>${version}</code></p>
</body>
</html>`);
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

function start(listenPort = port) {
  const server = http.createServer(handler);
  server.listen(listenPort, () => {
    console.log(`listening on :${server.address().port} (version ${version})`);
  });

  // Container Apps sends SIGTERM when a revision is replaced.
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { handler, start };
