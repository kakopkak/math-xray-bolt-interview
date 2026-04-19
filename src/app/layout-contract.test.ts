import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");

test("layout metadata includes Open Graph fields for social preview", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /openGraph:\s*\{/);
  assert.match(source, /locale:\s*"et_EE"/);
  assert.match(source, /type:\s*"website"/);
  assert.match(source, /images:\s*\[/);
  assert.match(source, /url:\s*"\s*\/opengraph-image\.png\s*"/);
  assert.doesNotMatch(source, /url:\s*"\s*\/icon\.svg\s*"/);
});

test("layout metadata sets explicit branded app icons", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /icons:\s*\{/);
  assert.match(source, /icon:\s*"\s*\/icon\.svg\s*"/);
});
