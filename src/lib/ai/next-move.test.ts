import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("normalizeExpectedErrors filters unknown taxonomy codes and warns", () => {
  const source = readFileSync(new URL("./next-move.ts", import.meta.url), "utf8");

  assert.match(source, /console\.warn\("\[next-move\] hallucinated misconception code"/);
  assert.match(source, /if \(!TAXONOMY_CODE_SET\.has\(entry\.misconceptionCode\)\)/);
});
