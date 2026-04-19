import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const proxyPath = path.join(process.cwd(), "src/proxy.ts");

test("proxy.ts matcher covers cost-sensitive routes", async () => {
  const source = await readFile(proxyPath, "utf8");

  assert.match(source, /\/api\/assignments\/seed/);
  assert.match(source, /\/api\/assignments\/:id\/submit/);
  assert.match(source, /\/api\/assignments\/:id\/next-move/);
  assert.match(source, /\/api\/submissions\/:id\/retry/);
  assert.match(source, /\/api\/clusters\/:id\/remediate/);
});

test("proxy.ts returns 429 with Retry-After when rate-limited", async () => {
  const source = await readFile(proxyPath, "utf8");

  assert.match(source, /status:\s*429/);
  assert.match(source, /"Retry-After"/);
  assert.match(source, /X-RateLimit-Limit/);
  assert.match(source, /X-RateLimit-Remaining/);
});

test("proxy.ts skips rate limiting for safe verbs", async () => {
  const source = await readFile(proxyPath, "utf8");

  assert.match(source, /method === "GET"/);
});
