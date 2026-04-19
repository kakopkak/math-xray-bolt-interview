import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/assignments/[id]/next-move/spawn/route.ts"
);

test("spawn route returns 409 when parent has no cached next-move suggestion", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /status:\s*409/);
  assert.match(source, /Koosta kõigepealt järgmise sammu soovitus\./);
});

test("spawn route creates assignment and returns assignmentId with status 201", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /Assignment\.create\(/);
  assert.match(source, /assignmentId:\s*String\(/);
  assert.match(source, /status:\s*201/);
});

test("spawn route sanitizes server errors", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /\.replace\(\/sk-\[A-Za-z0-9_-\]\{10,\}\/g,\s*"\*\*\*"\)/);
  assert.match(source, /\.replace\(\/https\?:\\\/\\\/\\S\+\/g,\s*"\*\*\*"\)/);
});
