import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const nextConfigPath = path.join(process.cwd(), "next.config.ts");

test("next.config.ts emits the required security headers on every path", async () => {
  const source = await readFile(nextConfigPath, "utf8");

  assert.match(source, /source:\s*"\/:path\*"/);
  assert.match(source, /Content-Security-Policy/);
  assert.match(source, /X-Frame-Options/);
  assert.match(source, /X-Content-Type-Options/);
  assert.match(source, /Referrer-Policy/);
  assert.match(source, /Permissions-Policy/);
  assert.match(source, /Strict-Transport-Security/);
});

test("CSP forbids framing and locks default-src to self", async () => {
  const source = await readFile(nextConfigPath, "utf8");

  assert.match(source, /default-src 'self'/);
  assert.match(source, /frame-ancestors 'none'/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /base-uri 'self'/);
});
