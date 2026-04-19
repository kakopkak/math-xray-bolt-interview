import assert from "node:assert/strict";
import test from "node:test";
import { getCountUpFrameValue } from "./use-count-up.ts";

test("getCountUpFrameValue starts from start value", () => {
  assert.equal(getCountUpFrameValue(0, 42, 0, 800), 0);
  assert.equal(getCountUpFrameValue(5, 15, 0, 800), 5);
});

test("getCountUpFrameValue reaches target when duration completes", () => {
  assert.equal(getCountUpFrameValue(0, 42, 800, 800), 42);
  assert.equal(getCountUpFrameValue(10, 2, 1200, 800), 2);
});

test("getCountUpFrameValue progresses monotonically with ease-out", () => {
  const first = getCountUpFrameValue(0, 100, 200, 800);
  const second = getCountUpFrameValue(0, 100, 400, 800);
  const third = getCountUpFrameValue(0, 100, 600, 800);

  assert.ok(first > 0 && first < 100);
  assert.ok(second > first && second < 100);
  assert.ok(third > second && third < 100);
});
