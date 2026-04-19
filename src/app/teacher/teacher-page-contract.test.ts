import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const teacherPagePath = path.join(process.cwd(), "src/app/teacher/page.tsx");

test("teacher dashboard uses design-system primitives and Estonian submissions wording", async () => {
  const source = await readFile(teacherPagePath, "utf8");

  assert.match(source, /SuperDashboardClient/);
  assert.match(source, /buildTeacherSuperDashboard/);
  assert.match(source, /initialDashboard/);
  assert.match(source, /initialAssignments/);
  assert.match(source, /Ülesandeid veel ei ole/);
  assert.match(source, /Loo ülesanne/);
});
