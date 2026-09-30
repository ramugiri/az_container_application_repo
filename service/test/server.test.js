const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { handler } = require("../src/server");

let server;
let base;

before(async () => {
  server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test("GET /health returns ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "ok");
});

test("GET /api/info reports the replica and never leaks secret values", async () => {
  process.env.DATABASE_URL = "postgresql://user:secret@host/db";
  const res = await fetch(`${base}/api/info`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, "mcm-service");
  assert.ok(body.replica);
  assert.equal(body.config.databaseUrl, true);
  assert.doesNotMatch(JSON.stringify(body), /secret/);
  delete process.env.DATABASE_URL;
});

test("unknown path returns 404", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});
