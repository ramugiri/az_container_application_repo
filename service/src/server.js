const http = require("node:http");
const os = require("node:os");

const port = Number(process.env.PORT) || 3000;
const version = process.env.APP_VERSION || "local";
const startedAt = new Date().toISOString();

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    return json(res, 200, { status: "ok", version });
  }

  // Shows which replica answered and what reached it, to trace the request path.
  // Only reports whether config is present - never the values.
  if (url.pathname === "/api/info") {
    return json(res, 200, {
      service: "mcm-service",
      version,
      replica: os.hostname(),
      startedAt,
      time: new Date().toISOString(),
      request: {
        host: req.headers.host,
        forwardedFor: req.headers["x-forwarded-for"] || null,
        forwardedProto: req.headers["x-forwarded-proto"] || null,
        remoteAddress: req.socket.remoteAddress,
      },
      config: {
        databaseUrl: Boolean(process.env.DATABASE_URL),
        ppmBasicAuth: Boolean(process.env.PPM_BASIC_AUTH),
        filesMountPath: process.env.FILES_MOUNT_PATH || null,
      },
    });
  }

  json(res, 404, { error: "not found" });
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
