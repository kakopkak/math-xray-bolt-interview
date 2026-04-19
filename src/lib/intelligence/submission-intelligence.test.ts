import assert from "node:assert/strict";
import test from "node:test";
import { buildSubmissionIntelligence } from "./submission-intelligence";

test("submission intelligence detects uncertainty and review priority", () => {
  const intelligence = buildSubmissionIntelligence({
    steps: [
      { stepNumber: 1, isCorrect: true, confidence: 0.8 },
      { stepNumber: 2, isCorrect: false, confidence: 0.42, misconceptionCode: "QE_SIGN_ERROR" },
    ],
    analysis: {
      primaryMisconception: "QE_SIGN_ERROR",
      firstErrorStep: 2,
      finalAnswerCorrect: true,
    },
    analysisMeta: {
      extractionSource: "heuristic",
      classificationSource: "ai",
      extractionIsComplete: false,
      deterministicGateApplied: true,
      averageConfidence: 0.49,
      lowConfidenceStepCount: 1,
    },
  });

  assert.equal(intelligence.firstWrongStep, 2);
  assert.equal(intelligence.finalAnswerReasoningDivergence, true);
  assert.equal(intelligence.uncertaintyLevel, "high");
  assert.equal(intelligence.reviewPriority, "high");
  assert.equal(intelligence.reviewPriorityScore >= 7, true);
  assert.equal(intelligence.uncertaintyReasons.includes("heuristic_extraction"), true);
});

test("submission intelligence detects recovery step", () => {
  const intelligence = buildSubmissionIntelligence({
    steps: [
      { stepNumber: 1, isCorrect: true, confidence: 0.9 },
      { stepNumber: 2, isCorrect: false, confidence: 0.6, misconceptionCode: "QE_ARITHMETIC" },
      { stepNumber: 3, isCorrect: true, confidence: 0.8 },
    ],
    analysis: {
      primaryMisconception: "QE_ARITHMETIC",
      firstErrorStep: 2,
      finalAnswerCorrect: false,
    },
    analysisMeta: {
      extractionSource: "ai",
      classificationSource: "ai",
      extractionIsComplete: true,
      deterministicGateApplied: false,
      averageConfidence: 0.8,
      lowConfidenceStepCount: 0,
    },
  });

  assert.equal(intelligence.recoveryStep, 3);
  assert.equal(intelligence.uncertaintyLevel, "low");
});

test("submission intelligence treats no steps and no analysis as high uncertainty", () => {
  const intelligence = buildSubmissionIntelligence({
    steps: [],
    analysis: null,
    analysisMeta: null,
  });

  assert.equal(intelligence.firstWrongStep, null);
  assert.equal(intelligence.recoveryStep, null);
  assert.equal(intelligence.uncertaintyLevel, "high");
  assert.equal(intelligence.reviewPriority, "high");
  assert.equal(intelligence.reviewPriorityScore, 7);
  assert.deepEqual(intelligence.uncertaintyReasons, ["analysis_missing", "low_confidence"]);
});

test("submission intelligence marks voice mismatch as divergence", () => {
  const intelligence = buildSubmissionIntelligence({
    steps: [
      { stepNumber: 1, isCorrect: true, confidence: 0.9 },
      { stepNumber: 2, isCorrect: false, confidence: 0.8, misconceptionCode: "QE_SIGN_ERROR" },
    ],
    analysis: {
      primaryMisconception: "QE_SIGN_ERROR",
      firstErrorStep: 2,
      finalAnswerCorrect: false,
    },
    analysisMeta: {
      extractionSource: "ai",
      classificationSource: "ai",
      extractionIsComplete: true,
      deterministicGateApplied: false,
      averageConfidence: 0.82,
      lowConfidenceStepCount: 0,
    },
    voiceMeta: {
      transcript: "Ma sain x võrdub 5.",
      finalAnswer: "x=5",
    },
  });

  assert.equal(intelligence.voiceReasoningAvailable, true);
  assert.equal(intelligence.verbalReasoningDivergence, true);
  assert.equal(intelligence.uncertaintyReasons.includes("voice_reasoning_divergence"), true);
});
