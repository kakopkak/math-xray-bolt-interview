import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const clientPath = path.join(process.cwd(), "src/app/solve/[token]/solve-client.tsx");

test("solve client provides voice recording controls", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /MediaRecorder|record|audio/i);
  assert.match(source, /stop|re-record|uuesti/i);
});

test("solve client loads token homework payload", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /\/api\/homework\/\$\{token\}/);
  assert.match(source, /promptEt/);
  assert.match(source, /Kodutöö/);
});

test("solve client exposes topic notebook navigation hint", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /\/teacher\/topic\//);
  assert.match(source, /Õpetaja märkmik/);
});

test("solve client posts homework submissions with optional voice payload", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /\/api\/assignments\/\$\{homework\.assignmentId\}\/submit/);
  assert.match(source, /voiceAudioBase64/);
  assert.match(source, /voiceMimeType/);
});
