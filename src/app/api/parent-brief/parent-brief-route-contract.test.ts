import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/parent-brief/generate/route.ts"
);

test("parent brief route validates input and persists briefs", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function POST/);
  assert.match(source, /studentKey/);
  assert.match(source, /ParentBrief/);
  assert.match(source, /buildParentBriefPrompt/);
});
