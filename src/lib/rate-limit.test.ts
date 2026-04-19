import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRateLimitedPath,
  consumeRateLimit,
  RATE_LIMIT_RULES,
  resetRateLimitStoreForTests,
} from "./rate-limit";

test("token bucket allows up to capacity bursts then blocks", () => {
  resetRateLimitStoreForTests();
  const rule = { capacity: 3, refillPerSecond: 1 };
  const t0 = 1_000_000;

  const first = consumeRateLimit("ip-a", rule, t0);
  const second = consumeRateLimit("ip-a", rule, t0);
  const third = consumeRateLimit("ip-a", rule, t0);
  const fourth = consumeRateLimit("ip-a", rule, t0);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 2);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);
  assert.equal(fourth.allowed, false);
  assert.ok(fourth.retryAfterSeconds >= 1);
});

test("tokens refill linearly with elapsed time", () => {
  resetRateLimitStoreForTests();
  const rule = { capacity: 2, refillPerSecond: 1 };
  const t0 = 5_000_000;

  consumeRateLimit("ip-b", rule, t0);
  consumeRateLimit("ip-b", rule, t0);
  const blocked = consumeRateLimit("ip-b", rule, t0);
  assert.equal(blocked.allowed, false);

  const refilled = consumeRateLimit("ip-b", rule, t0 + 2_000);
  assert.equal(refilled.allowed, true);
});

test("buckets are isolated per key", () => {
  resetRateLimitStoreForTests();
  const rule = { capacity: 1, refillPerSecond: 0 };
  const t0 = 9_000_000;

  assert.equal(consumeRateLimit("ip-x", rule, t0).allowed, true);
  assert.equal(consumeRateLimit("ip-x", rule, t0).allowed, false);
  assert.equal(consumeRateLimit("ip-y", rule, t0).allowed, true);
});

test("classifyRateLimitedPath maps cost-sensitive routes", () => {
  assert.equal(
    classifyRateLimitedPath("/api/assignments/507f1f77bcf86cd799439011/submit"),
    "submit"
  );
  assert.equal(
    classifyRateLimitedPath("/api/submissions/abc/retry"),
    "retry"
  );
  assert.equal(
    classifyRateLimitedPath("/api/clusters/abc/remediate"),
    "remediate"
  );
  assert.equal(
    classifyRateLimitedPath("/api/assignments/abc/next-move"),
    "nextMove"
  );
  assert.equal(
    classifyRateLimitedPath("/api/assignments/abc/next-move/spawn"),
    "nextMove"
  );
  assert.equal(classifyRateLimitedPath("/api/assignments/seed"), "seed");
});

test("classifyRateLimitedPath returns null for unguarded routes", () => {
  assert.equal(classifyRateLimitedPath("/api/assignments"), null);
  assert.equal(
    classifyRateLimitedPath("/api/assignments/abc/analytics"),
    null
  );
  assert.equal(classifyRateLimitedPath("/teacher/assignment/abc"), null);
  assert.equal(classifyRateLimitedPath("/"), null);
});

test("RATE_LIMIT_RULES cover every classification", () => {
  const classifications = ["submit", "retry", "remediate", "nextMove", "seed"];
  for (const key of classifications) {
    assert.ok(
      RATE_LIMIT_RULES[key],
      `Missing rule for "${key}" — proxy.ts will throw at runtime.`
    );
    assert.ok(RATE_LIMIT_RULES[key].capacity > 0);
    assert.ok(RATE_LIMIT_RULES[key].refillPerSecond > 0);
  }
});
