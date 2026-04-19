/**
 * Structured JSON logger.
 *
 * One line per call, parseable by any log aggregator. Non-string values are
 * always stringified to keep grep-ability stable. Errors are unwrapped.
 *
 * Usage:
 *   const log = createLogger("api/submissions/submit", { requestId });
 *   log.info("submission_created", { submissionId });
 *   log.error("pipeline_failed", { submissionId }, error);
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function serializeError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

export type Logger = {
  debug: (event: string, context?: LogContext) => void;
  info: (event: string, context?: LogContext) => void;
  warn: (event: string, context?: LogContext, error?: unknown) => void;
  error: (event: string, context?: LogContext, error?: unknown) => void;
  child: (extra: LogContext) => Logger;
};

export function createLogger(scope: string, baseContext: LogContext = {}): Logger {
  const minLevel = LEVEL_PRIORITY[resolveMinLevel()];

  function emit(level: LogLevel, event: string, context: LogContext = {}, error?: unknown) {
    if (LEVEL_PRIORITY[level] < minLevel) return;

    const payload: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      scope,
      event,
      ...baseContext,
      ...context,
    };
    if (error !== undefined) {
      payload.error = serializeError(error);
    }

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (event, context) => emit("debug", event, context),
    info: (event, context) => emit("info", event, context),
    warn: (event, context, error) => emit("warn", event, context, error),
    error: (event, context, error) => emit("error", event, context, error),
    child: (extra) => createLogger(scope, { ...baseContext, ...extra }),
  };
}

const HEX = "0123456789abcdef";
function randomRequestId(): string {
  let id = "";
  for (let i = 0; i < 16; i += 1) {
    id += HEX[Math.floor(Math.random() * 16)];
  }
  return id;
}

export function resolveRequestId(request: { headers: Headers }): string {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    randomRequestId()
  );
}
