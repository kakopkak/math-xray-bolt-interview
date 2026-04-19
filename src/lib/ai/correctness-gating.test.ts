import test from 'node:test';
import assert from 'node:assert/strict';
import type { AnalysisResult, ExtractedStep } from '../models/submission.ts';
import { applyDeterministicCorrectnessGate } from './correctness-gating.ts';
import { classifyHeuristically, extractTypedStepsHeuristically } from './fallback-analysis.ts';

function createBaseline(): { classifiedSteps: ExtractedStep[]; analysis: AnalysisResult } {
  const classifiedSteps: ExtractedStep[] = [
    {
      stepNumber: 1,
      content: 'x^2 + 5x + 6 = 0',
      isCorrect: true,
      confidence: 0.95,
      misconceptionCode: 'QE_NO_ERROR',
      misconceptionLabel: 'Correct solution',
      misconceptionLabelEt: 'Korrektne lahendus',
      explanation: 'Correct setup.',
    },
    {
      stepNumber: 2,
      content: '(x+2)(x+3)=0',
      isCorrect: true,
      confidence: 0.95,
      misconceptionCode: 'QE_NO_ERROR',
      misconceptionLabel: 'Correct solution',
      misconceptionLabelEt: 'Korrektne lahendus',
      explanation: 'Correct factorization.',
    },
    {
      stepNumber: 3,
      content: 'x=-2 or x=-3',
      isCorrect: true,
      confidence: 0.95,
      misconceptionCode: 'QE_NO_ERROR',
      misconceptionLabel: 'Correct solution',
      misconceptionLabelEt: 'Korrektne lahendus',
      explanation: 'Correct roots.',
    },
  ];

  const analysis: AnalysisResult = {
    overallCorrect: true,
    finalAnswerCorrect: true,
    totalSteps: 3,
    correctSteps: 3,
    firstErrorStep: null,
    misconceptions: [],
    primaryMisconception: 'QE_NO_ERROR',
    severityScore: 0,
    strengthAreas: ['Good algebraic flow'],
    reasoningType: 'procedural',
  };

  return { classifiedSteps, analysis };
}

test('gating marks mismatch answers as incorrect even when AI says QE_NO_ERROR', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x=-2 or x=-3',
    extractedFinalAnswer: 'x=4',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, false);
  assert.equal(gated.analysis.finalAnswerCorrect, false);
  assert.notEqual(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
  assert.ok(gated.classifiedSteps.some((step) => !step.isCorrect));
});

test('gating marks low-confidence QE_NO_ERROR outputs as incorrect', () => {
  const baseline = createBaseline();
  baseline.classifiedSteps[2].confidence = 0.41;

  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x=-2 or x=-3',
    extractedFinalAnswer: 'x=-2 or x=-3',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, false);
  assert.notEqual(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
});

test('gating keeps high-confidence matching answers correct', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x=-2 or x=-3',
    extractedFinalAnswer: 'x=-2 or x=-3',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, true);
  assert.equal(gated.analysis.finalAnswerCorrect, true);
  assert.equal(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
  assert.ok(gated.classifiedSteps.every((step) => step.isCorrect));
});

test('gating supports Estonian final answer connectors', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x = -2 või x = -3',
    extractedFinalAnswer: 'x = -2 või x = -3',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, true);
  assert.equal(gated.analysis.finalAnswerCorrect, true);
  assert.equal(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
});

test('gating supports equivalent fraction and decimal answers', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x = 0.5 või x = -2',
    extractedFinalAnswer: 'x = 1/2 või x = -2',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, true);
  assert.equal(gated.analysis.finalAnswerCorrect, true);
  assert.equal(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
});

test('gating supports explicit plus-minus answers', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x = ±3',
    extractedFinalAnswer: 'x = -3 või x = 3',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, true);
  assert.equal(gated.analysis.finalAnswerCorrect, true);
  assert.equal(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
});

test('gating supports set notation in final answers', () => {
  const baseline = createBaseline();
  const gated = applyDeterministicCorrectnessGate({
    ...baseline,
    answerKey: 'x ∈ {-3, 2}',
    extractedFinalAnswer: 'x ∈ {2, -3}',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, true);
  assert.equal(gated.analysis.finalAnswerCorrect, true);
});

test('gating downgrades heuristic QE_NO_ERROR result when confidence is fallback-level', () => {
  const steps = extractTypedStepsHeuristically('x^2 + 5x + 6 = 0\n(x+2)(x+3)=0\nx=-2 or x=-3');
  const heuristic = classifyHeuristically(steps);
  const gated = applyDeterministicCorrectnessGate({
    classifiedSteps: heuristic.classifiedSteps,
    analysis: heuristic.analysis,
    answerKey: 'x=-2 or x=-3',
    extractedFinalAnswer: 'x=-2 or x=-3',
    extractionIsComplete: true,
  });

  assert.equal(gated.analysis.overallCorrect, false);
  assert.notEqual(gated.analysis.primaryMisconception, 'QE_NO_ERROR');
});

test('gating stays conservative when no steps were extracted', () => {
  const gated = applyDeterministicCorrectnessGate({
    classifiedSteps: [],
    analysis: {
      overallCorrect: true,
      finalAnswerCorrect: true,
      totalSteps: 0,
      correctSteps: 0,
      firstErrorStep: null,
      misconceptions: [],
      primaryMisconception: 'QE_NO_ERROR',
      severityScore: 0,
      strengthAreas: [],
      reasoningType: 'procedural',
    },
    answerKey: 'x = 3',
    extractedFinalAnswer: '',
    extractionIsComplete: false,
  });

  assert.equal(gated.gateApplied, true);
  assert.equal(gated.analysis.overallCorrect, false);
  assert.equal(gated.analysis.primaryMisconception, 'QE_WRONG_METHOD');
  assert.equal(gated.analysis.firstErrorStep, null);
  assert.equal(gated.classifiedSteps.length, 0);
});
