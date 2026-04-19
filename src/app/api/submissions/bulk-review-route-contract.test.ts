import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/submissions/bulk-review/route.ts"
);

test("bulk review route supports batch teacher review actions", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function POST/);
  assert.match(source, /submissionIds|ids/);
  assert.match(source, /ReviewOverrideSchema|BulkReview/);
  assert.doesNotMatch(source, /originalMisconceptionCode:\s*null/);
  assert.match(source, /originalMisconceptionCode:\s*\{\s*\$ifNull:\s*\[/);
});
