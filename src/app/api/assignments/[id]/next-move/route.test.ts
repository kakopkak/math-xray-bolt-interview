import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/assignments/[id]/next-move/route.ts"
);

test("next-move route uses generation lock coordination before calling suggestNextMove", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /generationLockAt/);
  assert.match(source, /findOneAndUpdate/);
  assert.match(source, /setTimeout\(r,\s*1500\)/);
});

test("next-move route sanitizes token and url fragments in 500 payload", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /\.replace\(\/sk-\[A-Za-z0-9_-\]\{10,\}\/g,\s*"\*\*\*"\)/);
  assert.match(source, /\.replace\(\/https\?:\\\/\\\/\\S\+\/g,\s*"\*\*\*"\)/);
  assert.match(source, /Järgmise sammu soovitust ei õnnestunud luua\./);
});
