import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/teacher/student/[studentKey]/route.ts"
);

test("student profile route validates teacher context and uses profile engine", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /buildStudentProfile/);
  assert.match(source, /studentKey/);
});
