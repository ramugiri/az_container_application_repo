const http = require("node:http");

const port = Number(process.env.PORT) || 8080;
const version = process.env.APP_VERSION || "local";

// Set by Terraform to the service's internal FQDN. Inside the VNet it resolves (via
// the environment's private DNS zone) to the environment's internal load balancer.
const serviceBaseUrl = () => process.env.SERVICE_BASE_URL;

async function callBackend() {
  const base = serviceBaseUrl();
  if (!base) return { ok: false, error: "SERVICE_BASE_URL is not set" };

  const target = `${base.replace(/\/$/, "")}/api/info`;
  const started = Date.now();
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(3000) });
    const body = await res.json();
    return { ok: res.ok, status: res.status, target, ms: Date.now() - started, body };
  } catch (err) {
    const reason = err.cause?.code || err.cause?.message || err.message;
    return { ok: false, target, ms: Date.now() - started, error: reason };
  }
}

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", version }));
  }

  if (url.pathname === "/api/backend") {
    const result = await callBackend();
    res.writeHead(result.ok ? 200 : 502, { "content-type": "application/json" });
    return res.end(JSON.stringify(result, null, 2));
  }

  if (url.pathname === "/") {
    const backend = await callBackend();
    const backendHtml = backend.ok
      ? `<p>Status: <strong style="color: green;">reachable</strong> (${backend.ms} ms)</p>
  <p>Answered by replica <code>${escape(backend.body.replica)}</code>, version <code>${escape(backend.body.version)}</code></p>`
      : `<p>Status: <strong style="color: #b00;">unreachable</strong> - <code>${escape(backend.error || `HTTP ${backend.status}`)}</code></p>`;

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>MCM</title></head>
<body style="font-family: system-ui, sans-serif; margin: 3rem;">
  <h1>Mobile Construction Management</h1>
  <p>Running on Azure Container Apps By Ram where I wanted to check the image updated in azure.</p>
  <p>Version: <code>${version}</code></p>
  <h2>Backend service</h2>
  <p>Target: <code>${escape(backend.target || "not configured")}</code></p>
  ${backendHtml}
  <p><a href="/api/backend">Raw backend response</a></p>
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
