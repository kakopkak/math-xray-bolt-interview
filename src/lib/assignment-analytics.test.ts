import assert from "node:assert/strict";
import test from "node:test";
import { buildAssignmentAnalytics } from "./assignment-analytics.ts";

test("buildAssignmentAnalytics computes distribution and class intelligence", () => {
  const analytics = buildAssignmentAnalytics([
    {
      _id: "sub-1",
      studentName: "Anna",
      studentKey: "anna",
      processingStatus: "complete",
      analysis: { primaryMisconception: "QE_SIGN_ERROR", severityScore: 6, firstErrorStep: 2 },
      analysisMeta: {
        extractionSource: "ai",
        classificationSource: "ai",
        extractionIsComplete: true,
        deterministicGateApplied: false,
        averageConfidence: 0.61,
        lowConfidenceStepCount: 1,
      },
      teacherReview: { status: "unreviewed" },
    },
    {
      _id: "sub-2",
      studentName: "Boris",
      studentKey: "boris",
      processingStatus: "complete",
      analysis: { primaryMisconception: "QE_SIGN_ERROR", severityScore: 4, firstErrorStep: 3 },
      analysisMeta: {
        extractionSource: "heuristic",
        classificationSource: "ai",
        extractionIsComplete: true,
        deterministicGateApplied: true,
        averageConfidence: 0.49,
        lowConfidenceStepCount: 2,
      },
      teacherReview: { status: "unreviewed" },
    },
    {
      _id: "sub-3",
      studentName: "Carmen",
      studentKey: "carmen",
      processingStatus: "complete",
      analysis: { primaryMisconception: "QE_ARITHMETIC", severityScore: 2, firstErrorStep: 4 },
      analysisMeta: {
        extractionSource: "ai",
        classificationSource: "ai",
        extractionIsComplete: true,
        deterministicGateApplied: false,
        averageConfidence: 0.88,
        lowConfidenceStepCount: 0,
      },
      teacherReview: { status: "reviewed" },
    },
    {
      _id: "sub-4",
      studentName: "Dmitri",
      studentKey: "dmitri",
      processingStatus: "error",
      analysis: null,
    },
  ]);

  assert.equal(analytics.totalStudents, 4);
  assert.equal(analytics.completedCount, 3);
  assert.equal(analytics.errorCount, 1);

  assert.deepEqual(analytics.misconceptionDistribution, [
    {
      code: "QE_SIGN_ERROR",
      label: "Sign error when solving",
      labelEt: "Märgiviga lahendamisel",
      severity: "major",
      count: 2,
      percentage: 66.67,
    },
    {
      code: "QE_ARITHMETIC",
      label: "Basic arithmetic error",
      labelEt: "Arvutusviga",
      severity: "minor",
      count: 1,
      percentage: 33.33,
    },
  ]);

  assert.equal(analytics.classIntelligence.pulse.highPriorityReviewCount > 0, true);
  assert.equal(analytics.classIntelligence.pulse.highUncertaintyCount > 0, true);
  assert.equal(Array.isArray(analytics.classIntelligence.actionQueue), true);
  assert.equal(Array.isArray(analytics.classIntelligence.misconceptionRelations), true);
  assert.equal(Array.isArray(analytics.classIntelligence.rootConceptPressure), true);
});

test("buildAssignmentAnalytics includes student intelligence rows", () => {
  const analytics = buildAssignmentAnalytics([
    {
      _id: "sub-10",
      studentName: "Grete",
      studentKey: "grete",
      processingStatus: "complete",
      analysis: {
        primaryMisconception: "UNKNOWN_CODE",
        misconceptions: ["UNKNOWN_CODE", "QE_ARITHMETIC"],
        severityScore: 5,
        finalAnswerCorrect: false,
      },
      analysisMeta: {
        extractionSource: "ai",
        classificationSource: "ai",
        extractionIsComplete: true,
        deterministicGateApplied: false,
        averageConfidence: 0.7,
        lowConfidenceStepCount: 0,
      },
      teacherReview: { status: "unreviewed" },
    },
    {
      _id: "sub-11",
      studentName: "Heli",
      studentKey: "heli",
      processingStatus: "needs_manual_review",
      analysis: null,
      analysisMeta: {
        extractionSource: "heuristic",
        classificationSource: "not_run",
        extractionIsComplete: false,
        deterministicGateApplied: false,
        averageConfidence: 0,
        lowConfidenceStepCount: 0,
      },
      teacherReview: null,
    },
  ]);

  assert.equal(analytics.allStudents[0]?.studentKey, "grete");
  assert.deepEqual(analytics.allStudents[0]?.misconceptions, ["UNKNOWN_CODE", "QE_ARITHMETIC"]);
  assert.equal(typeof analytics.allStudents[0]?.intelligence?.reviewPriorityScore, "number");
  assert.equal(analytics.allStudents[1]?.processingStatus, "needs_manual_review");
  assert.equal(analytics.allStudents[1]?.intelligence, null);
  assert.deepEqual(analytics.allStudents[1]?.misconceptions, []);
  assert.equal(analytics.allStudents[1]?.primaryMisconceptionLabelEt, null);
});
