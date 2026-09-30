const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { handler } = require("../src/server");

let server;
let base;
let backend;

before(async () => {
  server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  // Stand-in for the backend service
  backend = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service: "mcm-service", version: "test", replica: "replica-1" }));
  });
  await new Promise((resolve) => backend.listen(0, resolve));
});

after(() => {
  server.close();
  backend.close();
});

test("GET /health returns ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "ok");
});

test("GET / returns the home page even without a backend", async () => {
  delete process.env.SERVICE_BASE_URL;
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Mobile Construction Management/);
  assert.match(html, /unreachable/);
});

test("GET / shows the backend replica when the backend answers", async () => {
  process.env.SERVICE_BASE_URL = `http://127.0.0.1:${backend.address().port}`;
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /reachable/);
  assert.match(html, /replica-1/);
  delete process.env.SERVICE_BASE_URL;
});

test("GET /api/backend returns 502 when the backend is down", async () => {
  process.env.SERVICE_BASE_URL = "http://127.0.0.1:1";
  const res = await fetch(`${base}/api/backend`);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).ok, false);
  delete process.env.SERVICE_BASE_URL;
});

test("unknown path returns 404", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});
