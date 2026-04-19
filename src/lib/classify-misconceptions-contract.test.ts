import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ai/classify-misconceptions.ts', import.meta.url), 'utf8');

test('classification fallback defaults to incorrect conservative labels when parsing fails', () => {
  assert.match(
    source,
    /console\.warn\('Classification response parsing failed; applying conservative fallback labels\.',\s*\{/
  );
  assert.match(source, /errorMessage:\s*getErrorMessage\(error\)/);
  assert.match(source, /isCorrect:\s*false/);
  assert.match(source, /confidence:\s*0/);
  assert.match(source, /fallbackMisconceptionCode\s*=\s*'QE_WRONG_METHOD'/);
  assert.match(source, /const CONSERVATIVE_FALLBACK_SEVERITY\s*=\s*[1-9]\d*/);
  assert.match(source, /primaryMisconception:\s*fallbackMisconceptionCode/);
  assert.match(source, /overallCorrect:\s*false/);
  assert.match(source, /severityScore:\s*CONSERVATIVE_FALLBACK_SEVERITY/);
  assert.match(
    source,
    /Klassifitseerimine ebaõnnestus; kasutati konservatiivset veamärgistust\./
  );
});
