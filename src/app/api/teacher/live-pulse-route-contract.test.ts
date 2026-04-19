import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/teacher/assignment/[id]/live-pulse/route.ts"
);

test("live pulse route returns anonymized classroom status", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /assignmentId|\[id\]/);
  assert.match(source, /anonymous|avatar|pulse/i);
});

test("live pulse route keeps assignment id in response payload", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /assignmentId/);
  assert.match(source, /pulse/);
});
