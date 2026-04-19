import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const classifySource = readFileSync(new URL('./ai/classify-misconceptions.ts', import.meta.url), 'utf8');
const extractSource = readFileSync(new URL('./ai/extract-steps.ts', import.meta.url), 'utf8');
const remediationSource = readFileSync(new URL('./ai/generate-remediation.ts', import.meta.url), 'utf8');
const pipelineSource = readFileSync(new URL('./ai/pipeline.ts', import.meta.url), 'utf8');

test('fallback warnings avoid raw error object dumps', () => {
  const sources = [classifySource, extractSource, remediationSource, pipelineSource];
  for (const source of sources) {
    assert.doesNotMatch(source, /console\.warn\([\s\S]*,\s*error\s*\)/);
    assert.match(source, /errorMessage:\s*getErrorMessage\(error\)/);
  }
});
