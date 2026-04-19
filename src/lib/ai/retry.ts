import { getErrorMessage } from "./error-utils";

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, nextAttempt: number, delayMs: number) => void;
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isOpenAIStatusError(error: unknown): error is { status: number } {
  return typeof error === "object" && error !== null && "status" in error && typeof (error as { status?: unknown }).status === "number";
}

export function isRetryableAIError(error: unknown): boolean {
  if (isOpenAIStatusError(error)) {
    const status = error.status;
    if (status === 408 || status === 409 || status === 425 || status === 429) {
      return true;
    }
    if (status >= 500 && status <= 599) {
      return true;
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("temporarily unavailable") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("ehostunreach") ||
    message.includes("etimedout")
  );
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    attempts = DEFAULT_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    shouldRetry = isRetryableAIError,
    onRetry,
  } = options;

  let attempt = 1;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 120);
      const delayMs = exponentialDelay + jitter;
      onRetry?.(error, attempt + 1, delayMs);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}
