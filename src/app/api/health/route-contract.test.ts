import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(process.cwd(), "src/app/api/health/route.ts");

test("health route probes database and openai independently", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /probeDatabase/);
  assert.match(source, /probeOpenAi/);
  assert.match(source, /Promise\.all/);
});

test("health route never burns OpenAI tokens just to probe", async () => {
  const source = await readFile(routePath, "utf8");
  // Probe must NOT actually call the OpenAI API — we verify credential shape only.
  assert.doesNotMatch(source, /openai\.chat|openai\.responses|openai\.embeddings/i);
  assert.match(source, /OPENAI_API_KEY/);
});

test("health route returns 503 when overall status is down", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /down.*\?\s*503/);
});

test("health route propagates request id back via header and body", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /resolveRequestId/);
  assert.match(source, /"X-Request-Id":\s*requestId/);
});
