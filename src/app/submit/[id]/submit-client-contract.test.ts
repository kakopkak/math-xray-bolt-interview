import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const submitClientPath = new URL("./submit-client.tsx", import.meta.url);

test("submit client uses segmented control and semantic tokens", async () => {
  const source = await readFile(submitClientPath, "utf8");

  assert.match(source, /SegmentedControl/);
  assert.match(source, /text-\[var\(--color-text\)\]/);
  assert.match(source, /text-\[var\(--color-error\)\]/);
  assert.match(source, /invalid=\{Boolean\(fieldErrors\.studentName\)\}/);
  assert.match(source, /invalid=\{Boolean\(fieldErrors\.typedSolution\)\}/);
  assert.doesNotMatch(source, /(zinc|rose|indigo)-\d{2,3}/);
});

test('submit client sends optional voice fields in payload', async () => {
  const source = await readFile(submitClientPath, 'utf8');

  assert.match(source, /voiceAudioBase64/);
  assert.match(source, /voiceMimeType/);
});
