import { getMisconceptionByCode, getMisconceptionDependencies } from "@/lib/taxonomy";
import type { SubmissionProcessingStatus } from "@/lib/submission-status";

type ProcessingStatus = SubmissionProcessingStatus;

type ReviewStatus = "unreviewed" | "reviewed" | "overridden";

type SubmissionForIntelligence = {
  submissionId: string;
  studentName: string;
  studentKey?: string | null;
  assignmentId?: string;
  createdAt?: string | Date;
  processingStatus: ProcessingStatus;
  analysis: {
    primaryMisconception?: string;
    misconceptions?: string[];
    severityScore?: number;
    firstErrorStep?: number | null;
    finalAnswerCorrect?: boolean;
  } | null;
  analysisMeta?: {
    averageConfidence?: number;
    lowConfidenceStepCount?: number;
  } | null;
  intelligence?: {
    uncertaintyLevel?: "low" | "medium" | "high";
    reviewPriority?: "low" | "medium" | "high";
    reviewPriorityScore?: number;
    dominantErrorDimension?: "procedural" | "conceptual" | "mixed";
    firstWrongStep?: number | null;
    recoveryStep?: number | null;
    finalAnswerReasoningDivergence?: boolean;
  } | null;
  teacherReview?: {
    status?: ReviewStatus;
  } | null;
};

type ClusterEntry = {
  code: string;
  count: number;
};

type ActionQueueItem = {
  submissionId: string;
  studentName: string;
  primaryMisconception: string;
  uncertaintyLevel: "low" | "medium" | "high";
  reviewPriority: "low" | "medium" | "high";
  reviewPriorityScore: number;
};

type MisconceptionRelation = {
  sourceCode: string;
  targetCode: string;
  kind: "depends_on" | "co_occurs";
  weight: number;
  support: number;
};

type RootConceptPressure = {
  code: string;
  labelEt: string;
  affectedStudents: number;
  percentage: number;
};

type RecurrenceSummary = {
  recurringStudentsCount: number;
  recurringStudentsShare: number;
  persistentMisconceptionCount: number;
};

type RemediationEffectSummary = {
  comparedStudents: number;
  improvedCount: number;
  unchangedCount: number;
  worsenedCount: number;
  improvedShare: number;
};

export type ClassIntelligence = {
  pulse: {
    highPriorityReviewCount: number;
    highUncertaintyCount: number;
    earlyBreakdownCount: number;
    divergenceCount: number;
  };
  actionQueue: ActionQueueItem[];
  misconceptionRelations: MisconceptionRelation[];
  rootConceptPressure: RootConceptPressure[];
  recurrence: RecurrenceSummary;
  remediationEffect: RemediationEffectSummary | null;
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Number(((part / whole) * 100).toFixed(1));
}

function normalizeDate(value: string | Date | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function toSeverityBucket(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  if (score >= 1) return 1;
  return 0;
}

function toWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(3));
}

function resolveSubmissionMisconceptions(
  submission: SubmissionForIntelligence
): string[] {
  const explicitCodes = unique(
    (submission.analysis?.misconceptions || []).filter(
      (code): code is string => typeof code === "string" && code !== "QE_NO_ERROR"
    )
  );

  if (explicitCodes.length > 0) {
    return explicitCodes;
  }

  const primary = submission.analysis?.primaryMisconception;
  if (primary && primary !== "QE_NO_ERROR") {
    return [primary];
  }

  return [];
}

function buildCoOccurrenceRelations(submissions: SubmissionForIntelligence[]): MisconceptionRelation[] {
  const pairCounter = new Map<string, number>();
  const codeCounter = new Map<string, number>();

  for (const submission of submissions) {
    if (submission.processingStatus !== "complete") continue;
    const misconceptionCodes = resolveSubmissionMisconceptions(submission);

    for (const code of misconceptionCodes) {
      codeCounter.set(code, (codeCounter.get(code) || 0) + 1);
    }

    for (let index = 0; index < misconceptionCodes.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < misconceptionCodes.length; nextIndex += 1) {
        const pair = [misconceptionCodes[index], misconceptionCodes[nextIndex]].sort();
        const key = `${pair[0]}::${pair[1]}`;
        pairCounter.set(key, (pairCounter.get(key) || 0) + 1);
      }
    }
  }

  return [...pairCounter.entries()]
    .map(([key, support]) => {
      const [sourceCode, targetCode] = key.split("::");
      const sourceCount = codeCounter.get(sourceCode) || 0;
      const targetCount = codeCounter.get(targetCode) || 0;
      const denominator = sourceCount + targetCount - support;

      return {
        sourceCode,
        targetCode,
        kind: "co_occurs" as const,
        weight: denominator > 0 ? toWeight(support / denominator) : 0,
        support,
      };
    })
    .filter((relation) => relation.support >= 2)
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        right.support - left.support ||
        left.sourceCode.localeCompare(right.sourceCode) ||
        left.targetCode.localeCompare(right.targetCode)
    )
    .slice(0, 12);
}

function buildDependencyRelations(
  clusterEntries: ClusterEntry[],
  totalCompleted: number
): MisconceptionRelation[] {
  const relations: MisconceptionRelation[] = [];
  for (const cluster of clusterEntries) {
    if (cluster.code === "QE_NO_ERROR" || cluster.count <= 0) continue;
    for (const dependencyCode of getMisconceptionDependencies(cluster.code)) {
      relations.push({
        sourceCode: dependencyCode,
        targetCode: cluster.code,
        kind: "depends_on",
        weight: totalCompleted > 0 ? toWeight(cluster.count / totalCompleted) : 0,
        support: cluster.count,
      });
    }
  }
  return relations;
}

function buildRootConceptPressure(clusterEntries: ClusterEntry[], totalCompleted: number): RootConceptPressure[] {
  const affectedByCode = new Map<string, number>();

  for (const cluster of clusterEntries) {
    if (cluster.code === "QE_NO_ERROR") continue;
    const dependencies = getMisconceptionDependencies(cluster.code);
    if (dependencies.length === 0) {
      affectedByCode.set(cluster.code, (affectedByCode.get(cluster.code) || 0) + cluster.count);
      continue;
    }
    for (const dependencyCode of dependencies) {
      affectedByCode.set(dependencyCode, (affectedByCode.get(dependencyCode) || 0) + cluster.count);
    }
  }

  return [...affectedByCode.entries()]
    .map(([code, affectedStudents]) => ({
      code,
      labelEt: getMisconceptionByCode(code)?.labelEt || code,
      affectedStudents,
      percentage: toPercent(affectedStudents, totalCompleted),
    }))
    .sort((left, right) => right.affectedStudents - left.affectedStudents)
    .slice(0, 5);
}

function buildRecurrenceSummary(submissions: SubmissionForIntelligence[]): RecurrenceSummary {
  const grouped = new Map<string, SubmissionForIntelligence[]>();
  for (const submission of submissions) {
    const key = (submission.studentKey || "").trim();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(submission);
  }

  let recurringStudentsCount = 0;
  let persistentMisconceptionCount = 0;

  for (const history of grouped.values()) {
    if (history.length < 2) continue;
    recurringStudentsCount += 1;

    const completed = history.filter((entry) => entry.processingStatus === "complete");
    const misconceptionCodes = unique(
      completed
        .map((entry) => entry.analysis?.primaryMisconception || "QE_NO_ERROR")
        .filter((code) => code !== "QE_NO_ERROR")
    );

    if (misconceptionCodes.length === 1 && completed.length >= 2) {
      persistentMisconceptionCount += 1;
    }
  }

  const trackedStudents = grouped.size;

  return {
    recurringStudentsCount,
    recurringStudentsShare: toPercent(recurringStudentsCount, trackedStudents),
    persistentMisconceptionCount,
  };
}

function buildRemediationEffectSummary(params: {
  currentSubmissions: SubmissionForIntelligence[];
  parentSubmissions: SubmissionForIntelligence[];
}): RemediationEffectSummary | null {
  const byParentStudentKey = new Map<string, SubmissionForIntelligence>();
  for (const parent of params.parentSubmissions) {
    if (parent.processingStatus !== "complete") continue;
    const key = (parent.studentKey || "").trim();
    if (!key) continue;
    const previous = byParentStudentKey.get(key);
    if (!previous || normalizeDate(parent.createdAt) > normalizeDate(previous.createdAt)) {
      byParentStudentKey.set(key, parent);
    }
  }

  let comparedStudents = 0;
  let improvedCount = 0;
  let unchangedCount = 0;
  let worsenedCount = 0;

  for (const current of params.currentSubmissions) {
    if (current.processingStatus !== "complete") continue;
    const key = (current.studentKey || "").trim();
    if (!key) continue;
    const parent = byParentStudentKey.get(key);
    if (!parent) continue;

    const parentSeverity = toSeverityBucket(parent.analysis?.severityScore || 0);
    const currentSeverity = toSeverityBucket(current.analysis?.severityScore || 0);
    comparedStudents += 1;

    if (currentSeverity < parentSeverity) {
      improvedCount += 1;
      continue;
    }
    if (currentSeverity > parentSeverity) {
      worsenedCount += 1;
      continue;
    }
    unchangedCount += 1;
  }

  if (comparedStudents === 0) return null;

  return {
    comparedStudents,
    improvedCount,
    unchangedCount,
    worsenedCount,
    improvedShare: toPercent(improvedCount, comparedStudents),
  };
}

export function buildClassIntelligence(params: {
  submissions: SubmissionForIntelligence[];
  clusterDistribution: ClusterEntry[];
  parentSubmissions?: SubmissionForIntelligence[];
}): ClassIntelligence {
  const completed = params.submissions.filter((submission) => submission.processingStatus === "complete");

  const highPriorityReviewCount = completed.filter(
    (submission) =>
      submission.intelligence?.reviewPriority === "high" &&
      (submission.teacherReview?.status || "unreviewed") === "unreviewed"
  ).length;
  const highUncertaintyCount = completed.filter(
    (submission) => submission.intelligence?.uncertaintyLevel === "high"
  ).length;
  const earlyBreakdownCount = completed.filter(
    (submission) => (submission.intelligence?.firstWrongStep || 99) <= 2
  ).length;
  const divergenceCount = completed.filter(
    (submission) => submission.intelligence?.finalAnswerReasoningDivergence
  ).length;

  const actionQueue: ActionQueueItem[] = completed
    .filter((submission) => (submission.teacherReview?.status || "unreviewed") === "unreviewed")
    .map((submission) => ({
      submissionId: submission.submissionId,
      studentName: submission.studentName,
      primaryMisconception: submission.analysis?.primaryMisconception || "QE_NO_ERROR",
      uncertaintyLevel: submission.intelligence?.uncertaintyLevel || "low",
      reviewPriority: submission.intelligence?.reviewPriority || "low",
      reviewPriorityScore: submission.intelligence?.reviewPriorityScore || 0,
    }))
    .sort((left, right) => right.reviewPriorityScore - left.reviewPriorityScore)
    .slice(0, 8);

  const dependencyRelations = buildDependencyRelations(
    params.clusterDistribution,
    completed.length
  );
  const coOccurrenceRelations = buildCoOccurrenceRelations(completed);
  const misconceptionRelations = [
    ...coOccurrenceRelations,
    ...dependencyRelations.sort((left, right) => right.support - left.support).slice(0, 8),
  ].slice(0, 16);

  const rootConceptPressure = buildRootConceptPressure(params.clusterDistribution, completed.length);

  return {
    pulse: {
      highPriorityReviewCount,
      highUncertaintyCount,
      earlyBreakdownCount,
      divergenceCount,
    },
    actionQueue,
    misconceptionRelations,
    rootConceptPressure,
    recurrence: buildRecurrenceSummary(params.submissions),
    remediationEffect: params.parentSubmissions
      ? buildRemediationEffectSummary({
          currentSubmissions: params.submissions,
          parentSubmissions: params.parentSubmissions,
        })
      : null,
  };
}
