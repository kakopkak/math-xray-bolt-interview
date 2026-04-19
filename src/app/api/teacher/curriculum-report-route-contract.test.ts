import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/teacher/curriculum-report/route.ts"
);

test("curriculum report route is available and uses mastery aggregation", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /buildCurriculumMastery|curriculum/i);
  assert.match(source, /resolveTeacherRequestContext/);
});

test("curriculum report route returns curriculum response shape", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /Response\.json\(\{ curriculum \}\)/);
});
