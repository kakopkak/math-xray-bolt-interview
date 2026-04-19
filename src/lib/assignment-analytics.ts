import { getMisconceptionByCode } from "./taxonomy.ts";
import { buildClassIntelligence, type ClassIntelligence } from "@/lib/intelligence/class-intelligence";
import { buildSubmissionIntelligence } from "@/lib/intelligence/submission-intelligence";
import type { SubmissionProcessingStatus } from "@/lib/submission-status";
import { resolveStudentKey } from "@/lib/student-key";

type ProcessingStatus = SubmissionProcessingStatus;

export type AssignmentAnalyticsSubmission = {
  _id: { toString(): string } | string;
  studentName: string;
  studentKey?: string | null;
  assignmentId?: { toString(): string } | string;
  createdAt?: string | Date;
  processingStatus: ProcessingStatus;
  analysis: {
    primaryMisconception?: string;
    misconceptions?: string[];
    severityScore?: number;
    firstErrorStep?: number | null;
    finalAnswerCorrect?: boolean;
    reasoningType?: "procedural" | "conceptual" | "mixed";
  } | null;
  analysisMeta?: {
    extractionSource?: "ai" | "heuristic";
    classificationSource?: "ai" | "heuristic" | "not_run";
    extractionIsComplete?: boolean;
    deterministicGateApplied?: boolean;
    deterministicGateReason?: string;
    averageConfidence?: number;
    lowConfidenceStepCount?: number;
  } | null;
  dataQuality?: {
    trustLevel?: "high" | "medium" | "low";
  } | null;
  teacherReview?: {
    status?: "unreviewed" | "reviewed" | "overridden";
    reviewedAt?: string | Date | null;
    note?: string;
    overrideMisconceptionCode?: string | null;
    originalMisconceptionCode?: string | null;
  } | null;
};

export type MisconceptionDistributionItem = {
  code: string;
  label: string;
  labelEt: string;
  severity: "minor" | "major" | "fundamental";
  count: number;
  percentage: number;
};

export type AssignmentAnalyticsStudent = {
  id: string;
  submissionId: string;
  createdAt: string | null;
  name: string;
  studentKey: string;
  primaryMisconception: string | null;
  misconceptions: string[];
  primaryMisconceptionLabelEt: string | null;
  severityScore: number;
  processingStatus: ProcessingStatus;
  analysisMeta: {
    extractionSource: "ai" | "heuristic";
    classificationSource: "ai" | "heuristic" | "not_run";
    extractionIsComplete: boolean;
    deterministicGateApplied: boolean;
    deterministicGateReason: string;
    averageConfidence: number;
    lowConfidenceStepCount: number;
  } | null;
  intelligence: {
    firstWrongStep: number | null;
    recoveryStep: number | null;
    finalAnswerReasoningDivergence: boolean;
    dominantErrorDimension: "procedural" | "conceptual" | "mixed";
    uncertaintyLevel: "low" | "medium" | "high";
    uncertaintyReasons: string[];
    reviewPriority: "low" | "medium" | "high";
    reviewPriorityScore: number;
  } | null;
  teacherReview: {
    status: "unreviewed" | "reviewed" | "overridden";
    reviewedAt: string | null;
    note: string;
    overrideMisconceptionCode: string | null;
    originalMisconceptionCode: string | null;
  } | null;
  dataQuality: {
    trustLevel: "high" | "medium" | "low";
  } | null;
};

export type AssignmentAnalytics = {
  totalStudents: number;
  completedCount: number;
  errorCount: number;
  misconceptionDistribution: MisconceptionDistributionItem[];
  classIntelligence: ClassIntelligence;
  allStudents: AssignmentAnalyticsStudent[];
};

function toSubmissionId(id: AssignmentAnalyticsSubmission["_id"]): string {
  return typeof id === "string" ? id : id.toString();
}

function resolvePrimaryMisconceptionLabelEt(code: string | null): string | null {
  if (!code) return null;
  return getMisconceptionByCode(code)?.labelEt ?? code;
}

export function buildAssignmentAnalytics(
  submissions: AssignmentAnalyticsSubmission[],
  options: {
    parentSubmissions?: AssignmentAnalyticsSubmission[];
  } = {}
): AssignmentAnalytics {
  const totalStudents = submissions.length;
  const completedSubmissions = submissions.filter(
    (submission) => submission.processingStatus === "complete"
  );
  const completedCount = completedSubmissions.length;
  const errorCount = submissions.filter(
    (submission) => submission.processingStatus === "error"
  ).length;

  const distributionMap = new Map<string, number>();
  for (const submission of completedSubmissions) {
    const code = submission.analysis?.primaryMisconception ?? "QE_NO_ERROR";
    distributionMap.set(code, (distributionMap.get(code) ?? 0) + 1);
  }

  const misconceptionDistribution = [...distributionMap.entries()]
    .map(([code, count]) => {
      const taxonomy = getMisconceptionByCode(code);
      const percentage =
        completedCount === 0
          ? 0
          : Number(((count / completedCount) * 100).toFixed(2));

      return {
        code,
        label: taxonomy?.label ?? code,
        labelEt: taxonomy?.labelEt ?? code,
        severity: taxonomy?.severity ?? "minor",
        count,
        percentage,
      };
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const allStudents = submissions.map((submission) => {
    const primaryMisconception = submission.analysis?.primaryMisconception ?? null;
    const intelligence =
      submission.processingStatus === "complete"
        ? buildSubmissionIntelligence({
            steps: [],
            analysis: submission.analysis,
            analysisMeta: submission.analysisMeta,
          })
        : null;
    const studentKey = resolveStudentKey(submission.studentName, submission.studentKey);

    return {
      id: toSubmissionId(submission._id),
      submissionId: toSubmissionId(submission._id),
      createdAt: submission.createdAt ? new Date(submission.createdAt).toISOString() : null,
      name: submission.studentName,
      studentKey,
      primaryMisconception,
      misconceptions: submission.analysis?.misconceptions ?? [],
      primaryMisconceptionLabelEt: resolvePrimaryMisconceptionLabelEt(primaryMisconception),
      severityScore: submission.analysis?.severityScore ?? 0,
      processingStatus: submission.processingStatus,
      analysisMeta: submission.analysisMeta
        ? {
            extractionSource: submission.analysisMeta.extractionSource ?? "ai",
            classificationSource: submission.analysisMeta.classificationSource ?? "ai",
            extractionIsComplete: submission.analysisMeta.extractionIsComplete ?? true,
            deterministicGateApplied: submission.analysisMeta.deterministicGateApplied ?? false,
            deterministicGateReason: submission.analysisMeta.deterministicGateReason ?? "",
            averageConfidence: submission.analysisMeta.averageConfidence ?? 0,
            lowConfidenceStepCount: submission.analysisMeta.lowConfidenceStepCount ?? 0,
          }
        : null,
      dataQuality: submission.dataQuality
        ? {
            trustLevel: submission.dataQuality.trustLevel ?? "low",
          }
        : null,
      intelligence,
      teacherReview: submission.teacherReview
        ? {
            status: submission.teacherReview.status ?? "unreviewed",
            reviewedAt: submission.teacherReview.reviewedAt
              ? new Date(submission.teacherReview.reviewedAt).toISOString()
              : null,
            note: submission.teacherReview.note ?? "",
            overrideMisconceptionCode: submission.teacherReview.overrideMisconceptionCode ?? null,
            originalMisconceptionCode: submission.teacherReview.originalMisconceptionCode ?? null,
          }
        : null,
    };
  });

  const classIntelligence = buildClassIntelligence({
    submissions: submissions.map((submission) => ({
      submissionId: toSubmissionId(submission._id),
      studentName: submission.studentName,
      studentKey: resolveStudentKey(submission.studentName, submission.studentKey),
      processingStatus: submission.processingStatus,
      analysis: {
        primaryMisconception: submission.analysis?.primaryMisconception,
        misconceptions: submission.analysis?.misconceptions,
        severityScore: submission.analysis?.severityScore,
        firstErrorStep:
          submission.processingStatus === "complete"
            ? buildSubmissionIntelligence({
                steps: [],
                analysis: submission.analysis,
                analysisMeta: submission.analysisMeta,
              }).firstWrongStep
            : null,
      },
      analysisMeta: submission.analysisMeta,
      intelligence:
        submission.processingStatus === "complete"
          ? buildSubmissionIntelligence({
              steps: [],
              analysis: submission.analysis,
              analysisMeta: submission.analysisMeta,
            })
          : null,
      teacherReview: submission.teacherReview
        ? {
            status: submission.teacherReview.status ?? "unreviewed",
          }
        : null,
    })),
    clusterDistribution: misconceptionDistribution.map((entry) => ({
      code: entry.code,
      count: entry.count,
    })),
    parentSubmissions: (options.parentSubmissions || []).map((submission) => ({
      submissionId: toSubmissionId(submission._id),
      studentName: submission.studentName,
      studentKey: resolveStudentKey(submission.studentName, submission.studentKey),
      processingStatus: submission.processingStatus,
      createdAt: submission.createdAt,
      analysis: submission.analysis,
      analysisMeta: submission.analysisMeta,
      intelligence:
        submission.processingStatus === "complete"
          ? buildSubmissionIntelligence({
              steps: [],
              analysis: submission.analysis,
              analysisMeta: submission.analysisMeta,
            })
          : null,
      teacherReview: submission.teacherReview
        ? {
            status: submission.teacherReview.status ?? "unreviewed",
          }
        : null,
    })),
  });

  return {
    totalStudents,
    completedCount,
    errorCount,
    misconceptionDistribution,
    classIntelligence,
    allStudents,
  };
}
