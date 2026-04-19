import assert from "node:assert/strict";
import test from "node:test";
import { isRetryableAIError, withRetry } from "./retry";

test("isRetryableAIError detects status-based retriable errors", () => {
  assert.equal(isRetryableAIError({ status: 429 }), true);
  assert.equal(isRetryableAIError({ status: 500 }), true);
  assert.equal(isRetryableAIError({ status: 400 }), false);
});

test("withRetry retries and succeeds on transient failure", async () => {
  let attempts = 0;
  const value = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 2) {
        throw { status: 429 };
      }
      return "ok";
    },
    { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 }
  );

  assert.equal(value, "ok");
  assert.equal(attempts, 2);
});

test("withRetry stops on non-retriable errors", async () => {
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          throw { status: 400 };
        },
        { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 }
      ),
    /\[object Object\]/
  );
});
