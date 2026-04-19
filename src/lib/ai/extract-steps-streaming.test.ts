import assert from "node:assert/strict";
import test from "node:test";
import { parseExtractionResponse } from "./extract-steps";

test("parseExtractionResponse reads newline-delimited streamed extraction output", () => {
  const result = parseExtractionResponse(
    [
      "STEP|1|x² + 5x + 6 = 0",
      "STEP|2|(x+2)(x+3)=0",
      "FINAL|x = -2 or -3",
      "COMPLETE|true",
    ].join("\n")
  );

  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0]?.content, "x² + 5x + 6 = 0");
  assert.equal(result.finalAnswer, "x = -2 or -3");
  assert.equal(result.isComplete, true);
});

test("parseExtractionResponse ignores malformed streaming lines", () => {
  const result = parseExtractionResponse(
    ["hello", "STEP|oops", "STEP|3|x = --2", "COMPLETE|false"].join("\n")
  );

  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0]?.stepNumber, 3);
  assert.equal(result.isComplete, false);
});
