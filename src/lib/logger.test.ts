import assert from "node:assert/strict";
import test from "node:test";
import { createLogger, resolveRequestId } from "./logger";

function captureConsole(method: "log" | "warn" | "error"): { restore: () => void; output: string[] } {
  const original = console[method];
  const output: string[] = [];
  console[method] = (...args: unknown[]) => {
    output.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  return {
    restore: () => {
      console[method] = original;
    },
    output,
  };
}

test("createLogger emits one JSON line per call with scope and event", () => {
  const cap = captureConsole("log");
  try {
    const log = createLogger("api/test", { requestId: "abc" });
    log.info("hello", { count: 3 });
    assert.equal(cap.output.length, 1);
    const parsed = JSON.parse(cap.output[0]);
    assert.equal(parsed.scope, "api/test");
    assert.equal(parsed.event, "hello");
    assert.equal(parsed.requestId, "abc");
    assert.equal(parsed.count, 3);
    assert.equal(parsed.level, "info");
    assert.ok(parsed.ts);
  } finally {
    cap.restore();
  }
});

test("logger.error unwraps Error objects", () => {
  const cap = captureConsole("error");
  try {
    const log = createLogger("api/test");
    log.error("boom", { id: 1 }, new Error("kaboom"));
    const parsed = JSON.parse(cap.output[0]);
    assert.equal(parsed.event, "boom");
    assert.equal(parsed.error.message, "kaboom");
    assert.ok(typeof parsed.error.stack === "string");
  } finally {
    cap.restore();
  }
});

test("logger.child merges base context", () => {
  const cap = captureConsole("log");
  try {
    const log = createLogger("api/test", { requestId: "r1" });
    const child = log.child({ submissionId: "s1" });
    child.info("ping");
    const parsed = JSON.parse(cap.output[0]);
    assert.equal(parsed.requestId, "r1");
    assert.equal(parsed.submissionId, "s1");
  } finally {
    cap.restore();
  }
});

test("resolveRequestId reads x-request-id and x-correlation-id, falls back to random", () => {
  const headersA = new Headers({ "x-request-id": "fixed-id-1" });
  assert.equal(resolveRequestId({ headers: headersA }), "fixed-id-1");

  const headersB = new Headers({ "x-correlation-id": "fixed-id-2" });
  assert.equal(resolveRequestId({ headers: headersB }), "fixed-id-2");

  const headersC = new Headers();
  const generated = resolveRequestId({ headers: headersC });
  assert.match(generated, /^[0-9a-f]{16}$/);
});
