import assert from "node:assert/strict";
import test from "node:test";
import { buildClassIntelligence } from "./class-intelligence";

test("class intelligence builds pulse and action queue", () => {
  const intelligence = buildClassIntelligence({
    submissions: [
      {
        submissionId: "s1",
        studentName: "Anna",
        studentKey: "anna",
        processingStatus: "complete",
        analysis: { primaryMisconception: "QE_SIGN_ERROR", severityScore: 6, firstErrorStep: 1 },
        intelligence: {
          firstWrongStep: 1,
          recoveryStep: null,
          finalAnswerReasoningDivergence: true,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "high",
          reviewPriority: "high",
          reviewPriorityScore: 9,
        },
        teacherReview: { status: "unreviewed" },
      },
      {
        submissionId: "s2",
        studentName: "Boris",
        studentKey: "boris",
        processingStatus: "complete",
        analysis: { primaryMisconception: "QE_ARITHMETIC", severityScore: 2, firstErrorStep: 3 },
        intelligence: {
          firstWrongStep: 3,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "low",
          reviewPriority: "low",
          reviewPriorityScore: 2,
        },
        teacherReview: { status: "reviewed" },
      },
    ],
    clusterDistribution: [
      { code: "QE_SIGN_ERROR", count: 1 },
      { code: "QE_ARITHMETIC", count: 1 },
    ],
  });

  assert.equal(intelligence.pulse.highPriorityReviewCount, 1);
  assert.equal(intelligence.pulse.highUncertaintyCount, 1);
  assert.equal(intelligence.actionQueue.length, 1);
  assert.equal(Array.isArray(intelligence.misconceptionRelations), true);
  assert.equal(Array.isArray(intelligence.rootConceptPressure), true);
});

test("class intelligence computes remediation effect against parent submissions", () => {
  const intelligence = buildClassIntelligence({
    submissions: [
      {
        submissionId: "c1",
        studentName: "Anna",
        studentKey: "anna",
        processingStatus: "complete",
        analysis: { primaryMisconception: "QE_ARITHMETIC", severityScore: 2 },
        intelligence: {
          firstWrongStep: 3,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "low",
          reviewPriority: "low",
          reviewPriorityScore: 2,
        },
        teacherReview: { status: "unreviewed" },
      },
    ],
    parentSubmissions: [
      {
        submissionId: "p1",
        studentName: "Anna",
        studentKey: "anna",
        processingStatus: "complete",
        analysis: { primaryMisconception: "QE_SIGN_ERROR", severityScore: 7 },
        intelligence: {
          firstWrongStep: 1,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "medium",
          reviewPriority: "medium",
          reviewPriorityScore: 5,
        },
        teacherReview: { status: "unreviewed" },
      },
    ],
    clusterDistribution: [{ code: "QE_ARITHMETIC", count: 1 }],
  });

  assert.ok(intelligence.remediationEffect);
  assert.equal(intelligence.remediationEffect?.comparedStudents, 1);
  assert.equal(intelligence.remediationEffect?.improvedCount, 1);
  assert.equal(intelligence.remediationEffect?.worsenedCount, 0);
});

test("class intelligence derives real co-occurrence edges from submission misconceptions", () => {
  const intelligence = buildClassIntelligence({
    submissions: [
      {
        submissionId: "s1",
        studentName: "Anna",
        studentKey: "anna",
        processingStatus: "complete",
        analysis: {
          primaryMisconception: "QE_SIGN_ERROR",
          misconceptions: ["QE_SIGN_ERROR", "QE_ARITHMETIC"],
          severityScore: 6,
        },
        intelligence: {
          firstWrongStep: 1,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "low",
          reviewPriority: "medium",
          reviewPriorityScore: 4,
        },
        teacherReview: { status: "unreviewed" },
      },
      {
        submissionId: "s2",
        studentName: "Boris",
        studentKey: "boris",
        processingStatus: "complete",
        analysis: {
          primaryMisconception: "QE_SIGN_ERROR",
          misconceptions: ["QE_SIGN_ERROR", "QE_ARITHMETIC"],
          severityScore: 5,
        },
        intelligence: {
          firstWrongStep: 2,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "low",
          reviewPriority: "medium",
          reviewPriorityScore: 4,
        },
        teacherReview: { status: "unreviewed" },
      },
      {
        submissionId: "s3",
        studentName: "Carmen",
        studentKey: "carmen",
        processingStatus: "complete",
        analysis: {
          primaryMisconception: "QE_SIGN_ERROR",
          misconceptions: ["QE_SIGN_ERROR"],
          severityScore: 3,
        },
        intelligence: {
          firstWrongStep: 3,
          recoveryStep: null,
          finalAnswerReasoningDivergence: false,
          dominantErrorDimension: "procedural",
          uncertaintyLevel: "low",
          reviewPriority: "low",
          reviewPriorityScore: 2,
        },
        teacherReview: { status: "reviewed" },
      },
    ],
    clusterDistribution: [{ code: "QE_SIGN_ERROR", count: 3 }],
  });

  const coOccurrence = intelligence.misconceptionRelations.find(
    (relation) =>
      relation.kind === "co_occurs" &&
      relation.sourceCode === "QE_ARITHMETIC" &&
      relation.targetCode === "QE_SIGN_ERROR"
  );

  assert.deepEqual(coOccurrence, {
    sourceCode: "QE_ARITHMETIC",
    targetCode: "QE_SIGN_ERROR",
    kind: "co_occurs",
    weight: 0.667,
    support: 2,
  });
});
