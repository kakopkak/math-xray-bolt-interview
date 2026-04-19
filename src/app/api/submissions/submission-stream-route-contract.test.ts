import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const streamRoutePath = path.join(process.cwd(), "src/app/api/submissions/[id]/stream/route.ts");

test("submission stream route uses SSE and tails extracted step updates", async () => {
  const source = await readFile(streamRoutePath, "utf8");

  assert.match(source, /new ReadableStream/);
  assert.match(source, /text\/event-stream/);
  assert.match(source, /encodeSseChunk\("update", payload\)/);
  assert.match(source, /extractedSteps/);
  assert.match(source, /TERMINAL_STATUSES/);
});
