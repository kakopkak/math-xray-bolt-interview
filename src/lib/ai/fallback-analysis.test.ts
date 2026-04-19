import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHeuristically,
  extractTypedStepsHeuristically,
} from './fallback-analysis';

test('extractTypedStepsHeuristically splits multiline input into ordered steps', () => {
  const input = 'x^2 + 5x + 6 = 0\n(x+2)(x+3)=0\nx=-2 or x=-3';
  const steps = extractTypedStepsHeuristically(input);

  assert.equal(steps.length, 3);
  assert.deepEqual(
    steps.map((step) => step.stepNumber),
    [1, 2, 3]
  );
});

test('classifyHeuristically marks clean factoring flow as correct', () => {
  const steps = extractTypedStepsHeuristically('x^2 + 5x + 6 = 0\n(x+2)(x+3)=0\nx=-2 or x=-3');
  const { analysis } = classifyHeuristically(steps);

  assert.equal(analysis.overallCorrect, true);
  assert.equal(analysis.primaryMisconception, 'QE_NO_ERROR');
  assert.equal(analysis.firstErrorStep, null);
});

test('classifyHeuristically flags division-by-x pattern as misconception', () => {
  const steps = extractTypedStepsHeuristically('x^2 + 2x = 0\nx(x+2)=0\nx+2=0 after dividing by x');
  const { analysis } = classifyHeuristically(steps);

  assert.equal(analysis.overallCorrect, false);
  assert.equal(analysis.primaryMisconception, 'QE_DIVISION_BY_X');
  assert.equal(analysis.firstErrorStep, 3);
});
