import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubmissionMasterySnapshot } from './mastery-snapshot';

test('buildSubmissionMasterySnapshot recognizes healthy mastery for correct solution', () => {
  const snapshot = buildSubmissionMasterySnapshot({
    analysis: {
      primaryMisconception: 'QE_NO_ERROR',
      severityScore: 0,
      finalAnswerCorrect: true,
    },
    intelligence: {
      dominantErrorDimension: 'mixed',
      finalAnswerReasoningDivergence: false,
      firstWrongStep: null,
    },
  });

  assert.equal(snapshot.topicMasteryScore > 85, true);
  assert.equal(snapshot.misconceptionPressureScore < 25, true);
});

test('buildSubmissionMasterySnapshot raises pressure for severe conceptual gap', () => {
  const snapshot = buildSubmissionMasterySnapshot({
    analysis: {
      primaryMisconception: 'QE_SQRT_BOTH_SIDES',
      severityScore: 9,
      finalAnswerCorrect: false,
    },
    intelligence: {
      dominantErrorDimension: 'conceptual',
      finalAnswerReasoningDivergence: true,
      firstWrongStep: 1,
    },
  });

  assert.equal(snapshot.misconceptionPressureScore > 70, true);
  assert.equal(snapshot.conceptualGapScore >= snapshot.proceduralGapScore, true);
});
