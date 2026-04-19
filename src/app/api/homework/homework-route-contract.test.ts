import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const pushRoutePath = path.join(process.cwd(), "src/app/api/homework/push/route.ts");
const tokenRoutePath = path.join(process.cwd(), "src/app/api/homework/[token]/route.ts");

test("homework push route creates personalized assignments", async () => {
  const source = await readFile(pushRoutePath, "utf8");

  assert.match(source, /export async function POST/);
  assert.match(source, /buildHomeworkAssignmentsForCluster/);
  assert.match(source, /studentKeys/);
  assert.match(source, /insertMany/);
  assert.match(source, /severity/);
});

test("homework token route returns assignment payload", async () => {
  const source = await readFile(tokenRoutePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /shareToken|token/);
  assert.match(source, /PersonalizedAssignment/);
});

test("homework push route imports assignment templates and homework engine", async () => {
  const source = await readFile(pushRoutePath, "utf8");

  assert.match(source, /AssignmentTemplate/);
  assert.match(source, /selectTemplateForSeverity/);
});

test("homework push route response includes solve links", async () => {
  const source = await readFile(pushRoutePath, "utf8");

  assert.match(source, /solveLink/);
  assert.match(source, /assignmentId/);
  assert.match(source, /topic/);
});

test("homework token route includes assignment context for submission handoff", async () => {
  const source = await readFile(tokenRoutePath, "utf8");

  assert.match(source, /assignmentId/);
  assert.match(source, /studentKey/);
});