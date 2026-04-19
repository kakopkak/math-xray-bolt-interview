import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const newAssignmentPagePath = path.join(process.cwd(), "src/app/teacher/new/page.tsx");

test("new assignment form copy is fully Estonian", async () => {
  const source = await readFile(newAssignmentPagePath, "utf8");

  assert.match(source, /Pealkiri/);
  assert.match(source, /Klass/);
  assert.match(source, /Teema/);
  assert.match(source, /Kirjeldus/);
  assert.match(source, /Vastuse võti/);
  assert.match(source, /Lahenda ruutvõrrandid ja näita sammud\./);
  assert.match(source, /Ülesande loomine ebaõnnestus\./);
  assert.match(source, /Võrguviga ülesande loomisel\./);
  assert.match(source, /text-\[var\(--color-text\)\]/);
  assert.doesNotMatch(source, /text-zinc-/);

  assert.doesNotMatch(source, /Pealkiri \/ Title/);
  assert.doesNotMatch(source, /Klass \/ Grade/);
  assert.doesNotMatch(source, /Kirjeldus \/ Description/);
  assert.doesNotMatch(source, /Correct approach/);
  assert.doesNotMatch(source, /Failed to create assignment\./);
  assert.doesNotMatch(source, /Network error while creating assignment\./);
});
