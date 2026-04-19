import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/teacher/notebook/[topic]/route.ts"
);

test("topic notebook route supports read and write operations", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /TopicNotebook/);
  assert.match(source, /organizationKey/);
});

test("topic notebook route keeps markdown safety guardrails", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /NotebookWriteSchema/);
  assert.match(source, /z\.string\(\)\.trim\(\)\.min\(1\)/);
});
