import assert from "node:assert/strict";
import test from "node:test";

test("openai client module is lazy at import time", async () => {
  const mod = await import("./openai-client");
  assert.equal(typeof mod.getOpenAIClient, "function");
});

test("openai client throws helpful error when OPENAI_API_KEY is missing", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const mod = await import("./openai-client");
    assert.throws(() => mod.getOpenAIClient(), /OPENAI_API_KEY is required/);
  } finally {
    if (previous !== undefined) {
      process.env.OPENAI_API_KEY = previous;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  }
});
