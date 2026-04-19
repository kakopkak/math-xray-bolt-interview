import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const extractStepsSource = readFileSync(new URL('./ai/extract-steps.ts', import.meta.url), 'utf8');
const classifySource = readFileSync(new URL('./ai/classify-misconceptions.ts', import.meta.url), 'utf8');
const remediationSource = readFileSync(new URL('./ai/generate-remediation.ts', import.meta.url), 'utf8');

test('extract-steps OpenAI calls define a shared 30s timeout', () => {
  assert.match(extractStepsSource, /const OPENAI_TIMEOUT_MS\s*=\s*30_000/);
  assert.equal((extractStepsSource.match(/timeout:\s*OPENAI_TIMEOUT_MS/g) || []).length, 2);
});

test('classification and remediation OpenAI calls use the shared 30s timeout', () => {
  assert.match(classifySource, /const OPENAI_TIMEOUT_MS\s*=\s*30_000/);
  assert.match(remediationSource, /const OPENAI_TIMEOUT_MS\s*=\s*30_000/);
  assert.equal((classifySource.match(/timeout:\s*OPENAI_TIMEOUT_MS/g) || []).length, 1);
  assert.equal((remediationSource.match(/timeout:\s*OPENAI_TIMEOUT_MS/g) || []).length, 1);
});
