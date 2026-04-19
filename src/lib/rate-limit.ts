/**
 * In-memory token bucket rate limiter.
 *
 * Sized for a single Next.js instance. For multi-instance/serverless deployments,
 * swap the underlying store for Redis (Upstash, etc.) — the API stays the same.
 */

export type RateLimitRule = {
  /** Capacity = max burst per key. */
  capacity: number;
  /** Tokens added per second per key. */
  refillPerSecond: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
};

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneIfOverCapacity() {
  if (buckets.size <= MAX_BUCKETS) return;
  // FIFO eviction by insertion order — the oldest entries usually belong to inactive IPs.
  const overflow = buckets.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of buckets.keys()) {
    if (removed >= overflow) break;
    buckets.delete(key);
    removed += 1;
  }
}

export function consumeRateLimit(
  bucketKey: string,
  rule: RateLimitRule,
  now: number = Date.now()
): RateLimitResult {
  const existing = buckets.get(bucketKey);
  const elapsedSeconds = existing ? Math.max(0, (now - existing.updatedAt) / 1000) : 0;
  const refilled = existing
    ? Math.min(rule.capacity, existing.tokens + elapsedSeconds * rule.refillPerSecond)
    : rule.capacity;

  if (refilled < 1) {
    const tokensNeeded = 1 - refilled;
    const retryAfterSeconds = Math.max(1, Math.ceil(tokensNeeded / rule.refillPerSecond));
    buckets.set(bucketKey, { tokens: refilled, updatedAt: now });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      limit: rule.capacity,
    };
  }

  const remaining = refilled - 1;
  buckets.set(bucketKey, { tokens: remaining, updatedAt: now });
  pruneIfOverCapacity();

  return {
    allowed: true,
    remaining: Math.floor(remaining),
    retryAfterSeconds: 0,
    limit: rule.capacity,
  };
}

export function resetRateLimitStoreForTests() {
  buckets.clear();
}

/**
 * Rules per route family. Tuned for a hackathon demo:
 * - submit: capped to prevent OpenAI runaway from a wedged client retry loop
 * - retry / remediate / next-move: cost-incurring teacher actions
 * - seed: 1/min — protects the demo dataset from accidental wipe-spam
 */
export const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  submit: { capacity: 30, refillPerSecond: 30 / 60 }, // 30 / minute
  retry: { capacity: 10, refillPerSecond: 10 / 60 }, // 10 / minute
  remediate: { capacity: 10, refillPerSecond: 10 / 60 }, // 10 / minute
  nextMove: { capacity: 20, refillPerSecond: 20 / 60 }, // 20 / minute
  seed: { capacity: 3, refillPerSecond: 3 / 60 }, // 3 / minute
};

export type RateLimitedRoute = keyof typeof RATE_LIMIT_RULES;

/**
 * Map a request URL pathname to a rate-limit rule key, or null if the route is
 * not rate-limited. Centralized so proxy.ts and tests stay in sync.
 */
export function classifyRateLimitedPath(pathname: string): RateLimitedRoute | null {
  // /api/assignments/[id]/submit
  if (/^\/api\/assignments\/[^/]+\/submit\/?$/.test(pathname)) return "submit";
  // /api/submissions/[id]/retry
  if (/^\/api\/submissions\/[^/]+\/retry\/?$/.test(pathname)) return "retry";
  // /api/clusters/[id]/remediate
  if (/^\/api\/clusters\/[^/]+\/remediate\/?$/.test(pathname)) return "remediate";
  // /api/assignments/[id]/next-move (and /spawn)
  if (/^\/api\/assignments\/[^/]+\/next-move(?:\/spawn)?\/?$/.test(pathname)) return "nextMove";
  // /api/assignments/seed
  if (/^\/api\/assignments\/seed\/?$/.test(pathname)) return "seed";
  return null;
}
