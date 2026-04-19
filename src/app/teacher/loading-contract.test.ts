import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const loadingPath = path.join(process.cwd(), "src/app/teacher/loading.tsx");

test("teacher route defines loading skeleton cards", async () => {
  const source = await readFile(loadingPath, "utf8");

  assert.match(source, /export default function Loading/);
  assert.match(source, /animate-pulse/);
  assert.match(source, /rounded-2xl border border-\[var\(--color-border\)\] bg-\[var\(--color-surface\)\] p-5 shadow-sm/);
});
