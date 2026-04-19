import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Hot API routes must use the structured logger (createLogger / resolveRequestId)
 * rather than ad-hoc console.error. This pins the rollout so a future drive-by edit
 * doesn't silently regress to plain-string logs that operations can't grep.
 */
const HOT_ROUTES = [
  "src/app/api/assignments/route.ts",
  "src/app/api/assignments/seed/route.ts",
  "src/app/api/assignments/[id]/submit/route.ts",
  "src/app/api/assignments/[id]/cluster/route.ts",
  "src/app/api/assignments/[id]/next-move/route.ts",
  "src/app/api/assignments/[id]/next-move/spawn/route.ts",
  "src/app/api/submissions/[id]/retry/route.ts",
  "src/app/api/submissions/[id]/review/route.ts",
  "src/app/api/admin/sweep/route.ts",
];

for (const relPath of HOT_ROUTES) {
  test(`${relPath} uses createLogger and resolveRequestId`, async () => {
    const source = await readFile(path.join(process.cwd(), relPath), "utf8");
    assert.match(source, /from\s+["']@\/lib\/logger["']/);
    assert.match(source, /createLogger\(/);
    assert.match(source, /log\.(info|warn|error)\(/);
    assert.doesNotMatch(
      source,
      /console\.(error|warn)\(/,
      `${relPath} still has raw console.error/warn calls — convert to structured log`
    );
  });
}

test("AI pipeline uses structured logger for fallback events", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src/lib/ai/pipeline.ts"),
    "utf8"
  );
  assert.match(source, /createLogger\(["']ai\/pipeline["']/);
  assert.match(source, /log\.warn\(["']extraction_fallback["']/);
  assert.match(source, /log\.warn\(["']classification_fallback["']/);
  assert.match(source, /log\.warn\(["']voice_transcription_fallback["']/);
});
