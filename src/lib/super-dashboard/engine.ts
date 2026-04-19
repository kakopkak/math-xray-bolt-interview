import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { Assignment } from '@/lib/models/assignment';
import { Submission } from '@/lib/models/submission';
import { TeacherIntervention } from '@/lib/models/teacher-intervention';
import { AnalyticsSnapshot } from '@/lib/models/analytics-snapshot';
import { getMisconceptionByCode, TOPIC_CATALOG } from '@/lib/taxonomy';
import { getMisconceptionDisplay } from '@/lib/misconception-labels';
import { resolveStudentKey } from '@/lib/student-key';
import { buildSubmissionIntelligence } from '@/lib/intelligence/submission-intelligence';
import { buildSubmissionMasterySnapshot } from '@/lib/intelligence/mastery-snapshot';
import { buildSubmissionDataQuality } from '@/lib/intelligence/data-quality';
import { parseSuperDashboardFilters, toSnapshotFilterHash } from '@/lib/super-dashboard/filters';
import type {
  SuperDashboardFilters,
  SuperDashboardKeyInsight,
  SuperDashboardResponse,
  SuperDashboardSeverityFilter,
  SuperDashboardTrendPoint,
} from '@/lib/super-dashboard/types';

import {
  HIGH_RISK_THRESHOLD,
  SUPER_DASHBOARD_INTERVENTION_SHARE_TARGET,
  SUPER_DASHBOARD_KEY_INSIGHT_DROP_THRESHOLD,
  SUPER_DASHBOARD_MAX_ASSIGNMENT_WEAK_POINTS,
  SUPER_DASHBOARD_MAX_DATA_QUALITY_REASONS,
  SUPER_DASHBOARD_MAX_FILTER_STUDENTS,
  SUPER_DASHBOARD_MAX_HEATMAP_CELLS,
  SUPER_DASHBOARD_MAX_HEATMAP_MISCONCEPTIONS,
  SUPER_DASHBOARD_MAX_HEATMAP_STUDENTS,
  SUPER_DASHBOARD_MAX_KEY_INSIGHTS,
  SUPER_DASHBOARD_MAX_STUDENTS_AT_RISK,
  SUPER_DASHBOARD_MAX_TOP_MISCONCEPTIONS,
  SUPER_DASHBOARD_MISCONCEPTION_GROWING_THRESHOLD,
  SUPER_DASHBOARD_MODEL_VERSION,
  SUPER_DASHBOARD_RECURRING_MISCONCEPTION_THRESHOLD,
  SUPER_DASHBOARD_SNAPSHOT_TTL_MS,
  SUPER_DASHBOARD_TREND_CHANGE_THRESHOLD,
  SUPER_DASHBOARD_WEAK_SPOTS_COUNT,
} from '@/lib/constants/dashboard';

const SEVERITY_OPTIONS: SuperDashboardSeverityFilter[] = ['minor', 'major', 'fundamental'];

type LeanSubmission = {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  assignmentTitle?: string;
  teacherId: string;
  organizationKey: string;
  classLabel: string;
  classKey: string;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  gradeLevel: number;
  studentName: string;
  studentKey: string;
  processingStatus: string;
  createdAt: Date;
  analysis?: {
    primaryMisconception?: string;
    severityScore?: number;
    finalAnswerCorrect?: boolean;
    firstErrorStep?: number | null;
    reasoningType?: 'procedural' | 'conceptual' | 'mixed';
  } | null;
  analysisMeta?: {
    extractionSource?: 'ai' | 'heuristic';
    classificationSource?: 'ai' | 'heuristic' | 'not_run';
    extractionIsComplete?: boolean;
    deterministicGateApplied?: boolean;
    averageConfidence?: number;
    lowConfidenceStepCount?: number;
  } | null;
  intelligence?: {
    uncertaintyLevel?: 'low' | 'medium' | 'high';
    reviewPriority?: 'low' | 'medium' | 'high';
    reviewPriorityScore?: number;
    dominantErrorDimension?: 'procedural' | 'conceptual' | 'mixed';
    firstWrongStep?: number | null;
    finalAnswerReasoningDivergence?: boolean;
  } | null;
  masterySnapshot?: {
    topicMasteryScore?: number;
    misconceptionPressureScore?: number;
    conceptualGapScore?: number;
    proceduralGapScore?: number;
  } | null;
  dataQuality?: {
    signalQualityScore?: number;
    trustLevel?: 'high' | 'medium' | 'low';
    reasons?: string[];
  } | null;
  extractedSteps?: Array<{
    stepNumber?: number;
    isCorrect?: boolean;
    confidence?: number;
    misconceptionCode?: string;
  }> | null;
  teacherReview?: {
    status?: 'unreviewed' | 'reviewed' | 'overridden';
  } | null;
};

type ResolvedSubmissionDerived = {
  studentKey: string;
  intelligence: NonNullable<LeanSubmission['intelligence']>;
  masterySnapshot: NonNullable<LeanSubmission['masterySnapshot']>;
  dataQuality: NonNullable<LeanSubmission['dataQuality']>;
};

const derivedSubmissionCache = new WeakMap<LeanSubmission, ResolvedSubmissionDerived>();

type LeanAssignment = {
  _id: mongoose.Types.ObjectId;
  title: string;
  classLabel: string;
  classKey: string;
  topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
  createdAt: Date;
  submissionCount?: number;
};

type LeanIntervention = {
  interventionType: string;
  outcome?: {
    trend?: 'improved' | 'unchanged' | 'worsened' | 'unknown';
    confidence?: 'high' | 'medium' | 'low';
  } | null;
};

function toNumber(value: unknown, fallback = 0): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function toPercent(part: number, whole: number, decimals = 1): number {
  if (whole <= 0) return 0;
  return Number(((part / whole) * 100).toFixed(decimals));
}

function toDateBucket(value: Date): string {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function defaultTopicLabel(topic: string): string {
  return TOPIC_CATALOG.find((entry) => entry.value === topic)?.labelEt || topic;
}

function getResolvedSubmissionDerived(submission: LeanSubmission): ResolvedSubmissionDerived {
  const cached = derivedSubmissionCache.get(submission);
  if (cached) {
    return cached;
  }

  const studentKey = resolveStudentKey(submission.studentName, submission.studentKey);
  const intelligence =
    submission.intelligence ||
    buildSubmissionIntelligence({
      steps: (submission.extractedSteps || []).map((step) => ({
        stepNumber: Number(step.stepNumber ?? 0),
        isCorrect: Boolean(step.isCorrect),
        confidence: Number(step.confidence ?? 0),
        misconceptionCode: step.misconceptionCode,
      })),
      analysis: submission.analysis || null,
      analysisMeta: submission.analysisMeta || null,
    });
  const masterySnapshot =
    submission.masterySnapshot ||
    buildSubmissionMasterySnapshot({
      analysis: submission.analysis || null,
      intelligence,
    });
  const dataQuality =
    submission.dataQuality ||
    buildSubmissionDataQuality({
      processingStatus: submission.processingStatus,
      analysisMeta: submission.analysisMeta || null,
      intelligence,
    });

  const resolved = {
    studentKey,
    intelligence,
    masterySnapshot,
    dataQuality,
  };
  derivedSubmissionCache.set(submission, resolved);
  return resolved;
}

function riskScoreForSubmission(submission: LeanSubmission): number {
  const intelligence = getResolvedSubmissionDerived(submission).intelligence;
  const reviewPriority = intelligence.reviewPriority || 'low';
  const severity = toNumber(submission.analysis?.severityScore, 0);
  const divergence = intelligence.finalAnswerReasoningDivergence ? 1 : 0;
  const earlyBreakdown =
    typeof intelligence.firstWrongStep === 'number' && intelligence.firstWrongStep <= 2
      ? 1
      : 0;
  const uncertainty = intelligence.uncertaintyLevel || 'low';

  const base =
    (reviewPriority === 'high' ? 26 : reviewPriority === 'medium' ? 14 : 5) +
    severity * 5 +
    divergence * 10 +
    earlyBreakdown * 8 +
    (uncertainty === 'high' ? 10 : uncertainty === 'medium' ? 5 : 0);

  return clamp(Math.round(base), 0, 100);
}

function parseDateRange(filters: SuperDashboardFilters) {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const to = filters.dateTo ? new Date(filters.dateTo) : null;
  return {
    from: from && Number.isFinite(from.getTime()) ? from : null,
    to: to && Number.isFinite(to.getTime()) ? to : null,
  };
}

function buildAssignmentMatch(filters: SuperDashboardFilters) {
  const match: Record<string, unknown> = {
    teacherId: filters.teacherId,
    organizationKey: filters.organizationKey,
  };

  if (filters.classKey) match.classKey = filters.classKey;
  if (filters.assignmentId && mongoose.Types.ObjectId.isValid(filters.assignmentId)) {
    match._id = new mongoose.Types.ObjectId(filters.assignmentId);
  }
  if (filters.topic) match.topic = filters.topic;

  return match;
}

function buildSubmissionMatch(filters: SuperDashboardFilters, assignmentIds: mongoose.Types.ObjectId[]) {
  const dateRange = parseDateRange(filters);
  const match: Record<string, unknown> = {
    teacherId: filters.teacherId,
    organizationKey: filters.organizationKey,
  };

  if (assignmentIds.length > 0) {
    match.assignmentId = { $in: assignmentIds };
  }
  if (filters.classKey) match.classKey = filters.classKey;
  if (filters.topic) match.topic = filters.topic;
  if (filters.studentKey) match.studentKey = filters.studentKey;
  if (filters.misconceptionCode) match['analysis.primaryMisconception'] = filters.misconceptionCode;

  if (dateRange.from || dateRange.to) {
    const createdAt: Record<string, Date> = {};
    if (dateRange.from) createdAt.$gte = dateRange.from;
    if (dateRange.to) createdAt.$lte = dateRange.to;
    match.createdAt = createdAt;
  }

  return match;
}

function isSubmissionSeverityMatch(
  submission: LeanSubmission,
  severity: SuperDashboardSeverityFilter | null | undefined
): boolean {
  if (!severity) return true;
  const code = submission.analysis?.primaryMisconception;
  if (!code) return false;
  const taxonomy = getMisconceptionByCode(code);
  if (!taxonomy) return false;
  return taxonomy.severity === severity;
}

function buildTrendSeries(submissions: LeanSubmission[]): SuperDashboardTrendPoint[] {
  const buckets = new Map<
    string,
    {
      total: number;
      masteryScores: number[];
      conceptual: number;
      procedural: number;
      divergence: number;
      highRisk: number;
    }
  >();

  for (const submission of submissions) {
    const derived = getResolvedSubmissionDerived(submission);
    const bucket = toDateBucket(submission.createdAt);
    if (!buckets.has(bucket)) {
      buckets.set(bucket, {
        total: 0,
        masteryScores: [],
        conceptual: 0,
        procedural: 0,
        divergence: 0,
        highRisk: 0,
      });
    }
    const current = buckets.get(bucket)!;
    current.total += 1;
    current.masteryScores.push(toNumber(derived.masterySnapshot.topicMasteryScore, 0));

    const dimension = derived.intelligence.dominantErrorDimension || 'mixed';
    if (dimension === 'conceptual' || dimension === 'mixed') current.conceptual += 1;
    if (dimension === 'procedural' || dimension === 'mixed') current.procedural += 1;
    if (derived.intelligence.finalAnswerReasoningDivergence) current.divergence += 1;
    if (riskScoreForSubmission(submission) >= HIGH_RISK_THRESHOLD) current.highRisk += 1;
  }

  return [...buckets.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([bucket, value]) => ({
      bucket,
      total: value.total,
      masteryRate: Number(average(value.masteryScores).toFixed(1)),
      conceptualGap: toPercent(value.conceptual, value.total),
      proceduralGap: toPercent(value.procedural, value.total),
      divergenceRate: toPercent(value.divergence, value.total),
      highRiskCount: value.highRisk,
    }));
}

function buildKeyInsights(params: {
  submissions: LeanSubmission[];
  misconceptionOverview: SuperDashboardResponse['misconceptionOverview'];
  studentsAtRisk: SuperDashboardResponse['studentsAtRisk'];
  trendSeries: SuperDashboardTrendPoint[];
  interventionImpact: SuperDashboardResponse['interventionImpact'];
}): SuperDashboardKeyInsight[] {
  const result: SuperDashboardKeyInsight[] = [];

  const topMisconception = params.misconceptionOverview[0] || null;
  if (topMisconception) {
    result.push({
      id: `top-misconception-${topMisconception.code}`,
      priority: topMisconception.growing ? 'high' : 'medium',
      title: `${topMisconception.labelEt} on peamine klassi takistus`,
      detail: `See muster katab ${topMisconception.share}% valitud lahendustest ja mõjutab ${topMisconception.studentCount} õpilast.`,
      evidence: `Trendimuutus ${topMisconception.trendDelta > 0 ? '+' : ''}${topMisconception.trendDelta} pp`,
      recommendation:
        topMisconception.dimension === 'conceptual'
          ? 'Planeeri 10-min kontseptuaalne mini-sekkumine ja kontrollküsimused enne uut ülesannet.'
          : 'Lisa järgmisse tundi kaks protseduurset kontrollsammu ja kohene enesekontroll.',
      dimension: topMisconception.dimension,
    });
  }

  const topRiskStudent = params.studentsAtRisk[0] || null;
  if (topRiskStudent) {
    result.push({
      id: `student-risk-${topRiskStudent.studentKey}`,
      priority: 'high',
      title: `${topRiskStudent.studentName} vajab sihitud tuge`,
      detail: `Riskiskoor ${topRiskStudent.riskScore} ja korduvaid mustreid ${topRiskStudent.recurringMisconceptionCount}.`,
      evidence: `${topRiskStudent.highPriorityUnreviewedCount} kontrollimata kõrge prioriteediga tööd`,
      recommendation: topRiskStudent.recommendation,
      dimension: 'mixed',
    });
  }

  if (params.trendSeries.length >= 2) {
    const latest = params.trendSeries[params.trendSeries.length - 1];
    const previous = params.trendSeries[params.trendSeries.length - 2];
    const delta = Number((latest.masteryRate - previous.masteryRate).toFixed(1));
    result.push({
      id: `trend-${latest.bucket}`,
      priority: delta <= SUPER_DASHBOARD_KEY_INSIGHT_DROP_THRESHOLD ? 'high' : 'medium',
      title:
        delta < 0
          ? `Klassi meisterlikkus langes ${Math.abs(delta)} punkti`
          : `Klassi meisterlikkus tõusis ${delta} punkti`,
      detail: `Viimane ajaperiood ${latest.bucket} näitab mastery ${latest.masteryRate}.`,
      evidence: `Eelmine period ${previous.bucket}: ${previous.masteryRate}`,
      recommendation:
        delta < 0
          ? 'Võrdle viimase kolme töö ülesandetüüpe ja tee lühike eelhäälestus enne uut kontrolli.'
          : 'Kinnista paranemine ühe ülekandeülesandega, et vältida tagasilangust.',
      dimension: 'mixed',
    });
  }

  if (params.interventionImpact.trackedCount > 0) {
    result.push({
      id: 'intervention-impact',
      priority: params.interventionImpact.improvedShare >= SUPER_DASHBOARD_INTERVENTION_SHARE_TARGET ? 'medium' : 'high',
      title: 'Sekkumiste mõju üle klassi',
      detail: `${params.interventionImpact.improvedShare}% jälgitud sekkumistest näitab paranemist.`,
      evidence: `${params.interventionImpact.improvedCount}/${params.interventionImpact.trackedCount} sekkumist`,
      recommendation:
        params.interventionImpact.improvedShare >= SUPER_DASHBOARD_INTERVENTION_SHARE_TARGET
          ? 'Hoia toimivad sekkumismustrid ja standardiseeri need riskigruppidele.'
          : 'Vaata üle sekkumiste ajastus ja lisa järelkontroll 48h jooksul.',
      dimension: 'mixed',
    });
  }

  return result.slice(0, SUPER_DASHBOARD_MAX_KEY_INSIGHTS);
}

function computeInterventionImpact(interventions: LeanIntervention[]) {
  let improvedCount = 0;
  let unchangedCount = 0;
  let worsenedCount = 0;
  let unknownCount = 0;

  const byTypeCounter = new Map<string, { count: number; improved: number }>();

  for (const intervention of interventions) {
    const trend = intervention.outcome?.trend || 'unknown';
    if (trend === 'improved') improvedCount += 1;
    else if (trend === 'unchanged') unchangedCount += 1;
    else if (trend === 'worsened') worsenedCount += 1;
    else unknownCount += 1;

    const current = byTypeCounter.get(intervention.interventionType) || { count: 0, improved: 0 };
    current.count += 1;
    if (trend === 'improved') current.improved += 1;
    byTypeCounter.set(intervention.interventionType, current);
  }

  const trackedCount = interventions.length;

  return {
    trackedCount,
    improvedCount,
    unchangedCount,
    worsenedCount,
    unknownCount,
    improvedShare: toPercent(improvedCount, trackedCount),
    byType: [...byTypeCounter.entries()]
      .map(([interventionType, value]) => ({
        interventionType,
        count: value.count,
        improvedShare: toPercent(value.improved, value.count),
      }))
      .sort((left, right) => right.count - left.count),
  };
}

function buildSnapshotKey(filters: SuperDashboardFilters): string {
  const hash = createHash('sha256').update(toSnapshotFilterHash(filters)).digest('hex').slice(0, 20);
  return `teacher-super-dashboard:${filters.teacherId}:${hash}`;
}

export async function buildTeacherSuperDashboard(input: {
  teacherId: string;
  organizationKey: string;
  classKey?: string | null;
  assignmentId?: string | null;
  topic?: string | null;
  studentKey?: string | null;
  misconceptionCode?: string | null;
  severity?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  bypassCache?: boolean;
}): Promise<SuperDashboardResponse> {
  const filters = parseSuperDashboardFilters({
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
    classKey: input.classKey,
    assignmentId: input.assignmentId,
    topic: input.topic,
    studentKey: input.studentKey,
    misconceptionCode: input.misconceptionCode,
    severity: input.severity,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });

  const snapshotKey = buildSnapshotKey(filters);
  const now = new Date();

  if (!input.bypassCache) {
    const cached = await AnalyticsSnapshot.findOne({
      key: snapshotKey,
      scope: 'teacher-super-dashboard',
      expiresAt: { $gt: now },
    })
      .select('payload expiresAt')
      .lean();

    const cachedPayload = cached?.payload as SuperDashboardResponse | undefined;

    if (cachedPayload?.meta?.modelVersion === SUPER_DASHBOARD_MODEL_VERSION) {
      return {
        ...cachedPayload,
        meta: {
          ...(cachedPayload.meta || {}),
          cache: {
            hit: true,
            key: snapshotKey,
            expiresAt: cached.expiresAt ? new Date(cached.expiresAt).toISOString() : null,
          },
        },
      };
    }
  }

  const assignmentMatch = buildAssignmentMatch(filters);
  const assignments = (await Assignment.find(assignmentMatch)
    .select('_id title classLabel classKey topic createdAt submissionCount')
    .sort({ createdAt: -1 })
    .lean()) as LeanAssignment[];

  const assignmentIds = assignments.map((assignment) => assignment._id);
  const submissionMatch = buildSubmissionMatch(filters, assignmentIds);

  const submissions = (await Submission.find(submissionMatch)
    .select(
      '_id assignmentId assignmentTitle teacherId organizationKey classLabel classKey topic gradeLevel studentName studentKey processingStatus createdAt analysis analysisMeta intelligence masterySnapshot dataQuality extractedSteps.stepNumber extractedSteps.isCorrect extractedSteps.confidence extractedSteps.misconceptionCode teacherReview'
    )
    .sort({ createdAt: -1 })
    .lean()) as LeanSubmission[];
  const severityFilteredSubmissions = filters.severity
    ? submissions.filter((submission) => isSubmissionSeverityMatch(submission, filters.severity))
    : submissions;

  const completed = severityFilteredSubmissions.filter(
    (submission) => submission.processingStatus === 'complete'
  );

  const interventions = (await TeacherIntervention.find({
    teacherId: filters.teacherId,
    organizationKey: filters.organizationKey,
    ...(filters.classKey ? { classKey: filters.classKey } : {}),
  })
    .select('interventionType outcome')
    .lean()) as LeanIntervention[];

  const classCounter = new Map<string, { classLabel: string; count: number }>();
  const topicCounter = new Map<string, { count: number; masteryScores: number[]; conceptual: number; procedural: number }>();
  const misconceptionCounter = new Map<string, { count: number; students: Set<string>; trend: Map<string, number> }>();
  const studentCounter = new Map<
    string,
    {
      name: string;
      classLabel: string;
      submissionCount: number;
      assignmentSet: Set<string>;
      riskValues: number[];
      misconceptionCounter: Map<string, number>;
      earlyBreakdownCount: number;
      divergenceCount: number;
      highPriorityUnreviewedCount: number;
      latestSubmissionId: string | null;
      latestAt: number;
      latestTrustLevel: 'high' | 'medium' | 'low';
      latestExtractionSource: 'ai' | 'heuristic';
    }
  >();

  const assignmentStats = new Map<
    string,
    {
      assignmentTitle: string;
      classLabel: string;
      topic: 'quadratic_equations' | 'linear_equations' | 'fractions';
      submissionCount: number;
      highSeverityCount: number;
      divergenceCount: number;
      pressureValues: number[];
      misconceptionCounter: Map<string, number>;
      createdAt: Date;
    }
  >();

  const qualityReasonCounter = new Map<string, number>();
  const qualityTrustCounter = { high: 0, medium: 0, low: 0 };
  const qualityScores: number[] = [];
  const lowTrustStudents = new Set<string>();

  const heatmapCellCounter = new Map<string, { studentKey: string; misconceptionCode: string; count: number; risk: number }>();

  for (const submission of severityFilteredSubmissions) {
    const derived = getResolvedSubmissionDerived(submission);
    const classKey = submission.classKey || 'unknown-class';
    const classLabel = submission.classLabel || classKey;
    const topic = submission.topic || 'quadratic_equations';
    const misconceptionCode = submission.analysis?.primaryMisconception || `${topic.split('_')[0].toUpperCase()}_NO_ERROR`;
    const risk = riskScoreForSubmission(submission);
    const bucket = toDateBucket(submission.createdAt);

    const classEntry = classCounter.get(classKey) || { classLabel, count: 0 };
    classEntry.count += 1;
    classCounter.set(classKey, classEntry);

    const topicEntry =
      topicCounter.get(topic) || { count: 0, masteryScores: [], conceptual: 0, procedural: 0 };
    topicEntry.count += 1;
    topicEntry.masteryScores.push(toNumber(derived.masterySnapshot.topicMasteryScore, 0));
    const dimension = derived.intelligence.dominantErrorDimension || 'mixed';
    if (dimension === 'conceptual' || dimension === 'mixed') topicEntry.conceptual += 1;
    if (dimension === 'procedural' || dimension === 'mixed') topicEntry.procedural += 1;
    topicCounter.set(topic, topicEntry);

    const misconceptionEntry =
      misconceptionCounter.get(misconceptionCode) || {
        count: 0,
        students: new Set<string>(),
        trend: new Map<string, number>(),
      };
    misconceptionEntry.count += 1;
    misconceptionEntry.students.add(derived.studentKey);
    misconceptionEntry.trend.set(bucket, (misconceptionEntry.trend.get(bucket) || 0) + 1);
    misconceptionCounter.set(misconceptionCode, misconceptionEntry);

    const studentKey = derived.studentKey;
    const studentEntry =
      studentCounter.get(studentKey) || {
        name: submission.studentName,
        classLabel,
        submissionCount: 0,
        assignmentSet: new Set<string>(),
        riskValues: [],
        misconceptionCounter: new Map<string, number>(),
        earlyBreakdownCount: 0,
        divergenceCount: 0,
        highPriorityUnreviewedCount: 0,
        latestSubmissionId: null,
        latestAt: 0,
        latestTrustLevel: 'high',
        latestExtractionSource: 'ai',
      };
    studentEntry.submissionCount += 1;
    studentEntry.assignmentSet.add(String(submission.assignmentId));
    studentEntry.riskValues.push(risk);
    studentEntry.misconceptionCounter.set(
      misconceptionCode,
      (studentEntry.misconceptionCounter.get(misconceptionCode) || 0) + 1
    );
    if (
      typeof derived.intelligence.firstWrongStep === 'number' &&
      derived.intelligence.firstWrongStep <= 2
    ) {
      studentEntry.earlyBreakdownCount += 1;
    }
    if (derived.intelligence.finalAnswerReasoningDivergence) {
      studentEntry.divergenceCount += 1;
    }
    if (
      derived.intelligence.reviewPriority === 'high' &&
      (submission.teacherReview?.status || 'unreviewed') === 'unreviewed'
    ) {
      studentEntry.highPriorityUnreviewedCount += 1;
    }
    const createdAtEpoch = submission.createdAt.getTime();
    if (createdAtEpoch > studentEntry.latestAt) {
      studentEntry.latestAt = createdAtEpoch;
      studentEntry.latestSubmissionId = String(submission._id);
      studentEntry.latestTrustLevel = derived.dataQuality.trustLevel || 'low';
      studentEntry.latestExtractionSource = submission.analysisMeta?.extractionSource || 'ai';
    }
    studentCounter.set(studentKey, studentEntry);

    const assignmentId = String(submission.assignmentId);
    const assignmentEntry =
      assignmentStats.get(assignmentId) || {
        assignmentTitle:
          submission.assignmentTitle || assignments.find((assignment) => String(assignment._id) === assignmentId)?.title || 'Ülesanne',
        classLabel,
        topic,
        submissionCount: 0,
        highSeverityCount: 0,
        divergenceCount: 0,
        pressureValues: [],
        misconceptionCounter: new Map<string, number>(),
        createdAt:
          assignments.find((assignment) => String(assignment._id) === assignmentId)?.createdAt || submission.createdAt,
      };
    assignmentEntry.submissionCount += 1;
    if (toNumber(submission.analysis?.severityScore, 0) >= 7) assignmentEntry.highSeverityCount += 1;
    if (derived.intelligence.finalAnswerReasoningDivergence) assignmentEntry.divergenceCount += 1;
    assignmentEntry.pressureValues.push(
      toNumber(derived.masterySnapshot.misconceptionPressureScore, risk)
    );
    assignmentEntry.misconceptionCounter.set(
      misconceptionCode,
      (assignmentEntry.misconceptionCounter.get(misconceptionCode) || 0) + 1
    );
    assignmentStats.set(assignmentId, assignmentEntry);

    const trustLevel = derived.dataQuality.trustLevel || 'low';
    qualityTrustCounter[trustLevel] += 1;
    if (trustLevel === 'low') {
      lowTrustStudents.add(studentKey);
    }
    qualityScores.push(toNumber(derived.dataQuality.signalQualityScore, 0));
    for (const reason of derived.dataQuality.reasons || []) {
      qualityReasonCounter.set(reason, (qualityReasonCounter.get(reason) || 0) + 1);
    }

    if (!misconceptionCode.endsWith('_NO_ERROR')) {
      const cellKey = `${studentKey}::${misconceptionCode}`;
      const currentCell = heatmapCellCounter.get(cellKey) || {
        studentKey,
        misconceptionCode,
        count: 0,
        risk: 0,
      };
      currentCell.count += 1;
      currentCell.risk = Math.max(currentCell.risk, risk);
      heatmapCellCounter.set(cellKey, currentCell);
    }
  }

  const trendSeries = buildTrendSeries(completed);

  const misconceptionOverview = [...misconceptionCounter.entries()]
    .map(([code, value]) => {
      const taxonomy = getMisconceptionByCode(code);
      const sortedTrend = [...value.trend.entries()].sort((left, right) => left[0].localeCompare(right[0]));
      const latest = sortedTrend[sortedTrend.length - 1]?.[1] || 0;
      const previous = sortedTrend[sortedTrend.length - 2]?.[1] || 0;
      const trendDelta = toPercent(latest - previous, Math.max(1, completed.length), 2);

      return {
        code,
        labelEt: taxonomy?.labelEt || getMisconceptionDisplay(code, 'et').label,
        severity: taxonomy?.severity || 'minor',
        dimension: taxonomy?.dimension || 'mixed',
        count: value.count,
        studentCount: value.students.size,
        share: toPercent(value.count, Math.max(1, completed.length)),
        trendDelta,
        growing: trendDelta > SUPER_DASHBOARD_MISCONCEPTION_GROWING_THRESHOLD,
      };
    })
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));

  const topicOverview = [...topicCounter.entries()]
    .map(([topic, value]) => ({
      topic: topic as 'quadratic_equations' | 'linear_equations' | 'fractions',
      labelEt: defaultTopicLabel(topic),
      submissionCount: value.count,
      completedCount: value.count,
      masteryScore: Number(average(value.masteryScores).toFixed(1)),
      gapRate: Number((100 - average(value.masteryScores)).toFixed(1)),
      conceptualShare: toPercent(value.conceptual, value.count),
      proceduralShare: toPercent(value.procedural, value.count),
      trendDelta:
        trendSeries.length >= 2
          ? Number(
              (
                trendSeries[trendSeries.length - 1].masteryRate -
                trendSeries[trendSeries.length - 2].masteryRate
              ).toFixed(1)
            )
          : 0,
    }))
    .sort((left, right) => left.masteryScore - right.masteryScore);

  const studentsAtRisk = [...studentCounter.entries()]
    .map(([studentKey, value]) => {
      const topMisconception = [...value.misconceptionCounter.entries()].sort((left, right) => right[1] - left[1])[0];
      const recurringMisconceptionCount = [...value.misconceptionCounter.values()].filter((count) => count >= 2).length;
      const averageRisk = Number(average(value.riskValues).toFixed(1));
      const trend: 'improving' | 'stable' | 'worsening' =
        value.riskValues.length >= 2
          ? value.riskValues[value.riskValues.length - 1] < value.riskValues[0] - SUPER_DASHBOARD_TREND_CHANGE_THRESHOLD
            ? 'improving'
            : value.riskValues[value.riskValues.length - 1] > value.riskValues[0] + SUPER_DASHBOARD_TREND_CHANGE_THRESHOLD
              ? 'worsening'
              : 'stable'
          : 'stable';

      const recommendation =
        recurringMisconceptionCount >= SUPER_DASHBOARD_RECURRING_MISCONCEPTION_THRESHOLD
          ? 'Kohtu õpilasega 1:1 ja anna üks sihitud järelülesanne sama väärarusaama kohta.'
          : averageRisk >= HIGH_RISK_THRESHOLD
            ? 'Kontrolli viimane lahendus koos õpilasega ja modelleeri esimene kriitiline samm.'
            : 'Jälgi järgmist esitust ja kinnista tugevad sammud lühikese suulise kontrolliga.';

      return {
        studentKey,
        studentName: value.name,
        classLabel: value.classLabel,
        assignmentCount: value.assignmentSet.size,
        submissionCount: value.submissionCount,
        riskScore: averageRisk,
        trend,
        topMisconceptionCode: topMisconception?.[0] || null,
        topMisconceptionLabelEt: topMisconception?.[0]
          ? getMisconceptionDisplay(topMisconception[0], 'et').label
          : null,
        recurringMisconceptionCount,
        earlyBreakdownCount: value.earlyBreakdownCount,
        divergenceCount: value.divergenceCount,
        highPriorityUnreviewedCount: value.highPriorityUnreviewedCount,
        trustLevel: value.latestTrustLevel,
        extractionSource: value.latestExtractionSource,
        recommendation,
        latestSubmissionId: value.latestSubmissionId,
      };
    })
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, SUPER_DASHBOARD_MAX_STUDENTS_AT_RISK);

  const assignmentWeakPoints = [...assignmentStats.entries()]
    .map(([assignmentId, value]) => {
      const topMisconception = [...value.misconceptionCounter.entries()].sort((left, right) => right[1] - left[1])[0];
      return {
        assignmentId,
        assignmentTitle: value.assignmentTitle,
        classLabel: value.classLabel,
        topic: value.topic,
        submissionCount: value.submissionCount,
        gapRate: Number((100 - average(value.pressureValues)).toFixed(1)),
        highSeverityShare: toPercent(value.highSeverityCount, value.submissionCount),
        divergenceShare: toPercent(value.divergenceCount, value.submissionCount),
        pressureScore: Number(average(value.pressureValues).toFixed(1)),
        topMisconceptionCode: topMisconception?.[0] || null,
        topMisconceptionLabelEt: topMisconception?.[0]
          ? getMisconceptionDisplay(topMisconception[0], 'et').label
          : null,
        createdAt: value.createdAt.toISOString(),
      };
    })
    .sort((left, right) => right.pressureScore - left.pressureScore)
    .slice(0, SUPER_DASHBOARD_MAX_ASSIGNMENT_WEAK_POINTS);

  const interventionImpact = computeInterventionImpact(interventions);

  const overview = {
    classCount: classCounter.size,
    assignmentCount: assignments.length,
    studentCount: studentCounter.size,
    masteryRate: Number(
      average(
        completed.map((submission) =>
          toNumber(getResolvedSubmissionDerived(submission).masterySnapshot.topicMasteryScore, 0)
        )
      ).toFixed(1)
    ),
    unresolvedHighRiskCount: completed.filter(
      (submission) =>
        riskScoreForSubmission(submission) >= HIGH_RISK_THRESHOLD &&
        (submission.teacherReview?.status || 'unreviewed') === 'unreviewed'
    ).length,
    conceptualShare: toPercent(
      completed.filter((submission) => {
        const dimension =
          getResolvedSubmissionDerived(submission).intelligence.dominantErrorDimension || 'mixed';
        return dimension === 'conceptual' || dimension === 'mixed';
      }).length,
      Math.max(1, completed.length)
    ),
    proceduralShare: toPercent(
      completed.filter((submission) => {
        const dimension =
          getResolvedSubmissionDerived(submission).intelligence.dominantErrorDimension || 'mixed';
        return dimension === 'procedural' || dimension === 'mixed';
      }).length,
      Math.max(1, completed.length)
    ),
    recurringGapStudents: studentsAtRisk.filter((student) => student.recurringMisconceptionCount > 0).length,
    recoveryFailureCount: studentsAtRisk.filter((student) => student.trend === 'worsening').length,
    strongestTopics: topicOverview
      .slice()
      .sort((left, right) => right.masteryScore - left.masteryScore)
      .slice(0, SUPER_DASHBOARD_WEAK_SPOTS_COUNT)
      .map((topic) => ({
        topic: topic.topic,
        labelEt: topic.labelEt,
        masteryScore: topic.masteryScore,
      })),
    weakestTopics: topicOverview
      .slice()
      .sort((left, right) => left.masteryScore - right.masteryScore)
      .slice(0, SUPER_DASHBOARD_WEAK_SPOTS_COUNT)
      .map((topic) => ({
        topic: topic.topic,
        labelEt: topic.labelEt,
        masteryScore: topic.masteryScore,
      })),
    topMisconceptions: misconceptionOverview.slice(0, SUPER_DASHBOARD_MAX_TOP_MISCONCEPTIONS).map((item) => ({
      code: item.code,
      labelEt: item.labelEt,
      count: item.count,
    })),
  };

  const filterOptions = {
    classes: [...classCounter.entries()].map(([classKey, value]) => ({
      classKey,
      classLabel: value.classLabel,
      count: value.count,
    })),
    assignments: assignments.map((assignment) => ({
      assignmentId: String(assignment._id),
      title: assignment.title,
      classKey: assignment.classKey,
      classLabel: assignment.classLabel,
      topic: assignment.topic,
      submissionCount: toNumber(assignment.submissionCount, 0),
      createdAt: assignment.createdAt.toISOString(),
    })),
    topics: topicOverview.map((topic) => ({ topic: topic.topic, labelEt: topic.labelEt, count: topic.submissionCount })),
    students: [...studentCounter.entries()]
      .map(([studentKey, value]) => ({
        studentKey,
        studentName: value.name,
        submissionCount: value.submissionCount,
      }))
      .sort((left, right) => right.submissionCount - left.submissionCount)
      .slice(0, SUPER_DASHBOARD_MAX_FILTER_STUDENTS),
    misconceptions: misconceptionOverview.map((item) => ({
      code: item.code,
      labelEt: item.labelEt,
      count: item.count,
    })),
    severities: [...SEVERITY_OPTIONS],
  };

  const gapHeatmap = {
    students: studentsAtRisk.slice(0, SUPER_DASHBOARD_MAX_HEATMAP_STUDENTS).map((student) => ({
      studentKey: student.studentKey,
      studentName: student.studentName,
      riskScore: student.riskScore,
    })),
    misconceptions: misconceptionOverview
      .filter((item) => !item.code.endsWith('_NO_ERROR'))
      .slice(0, SUPER_DASHBOARD_MAX_HEATMAP_MISCONCEPTIONS)
      .map((item) => ({ code: item.code, labelEt: item.labelEt })),
    cells: [...heatmapCellCounter.values()]
      .sort((left, right) => right.risk - left.risk || right.count - left.count)
      .slice(0, SUPER_DASHBOARD_MAX_HEATMAP_CELLS),
  };

  const dataQuality = {
    averageSignalQuality: Number(average(qualityScores).toFixed(1)),
    trustLevelDistribution: qualityTrustCounter,
    lowTrustShare: toPercent(qualityTrustCounter.low, Math.max(1, submissions.length)),
    lowTrustStudentCount: lowTrustStudents.size,
    topReasons: [...qualityReasonCounter.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, SUPER_DASHBOARD_MAX_DATA_QUALITY_REASONS),
  };

  const keyInsights = buildKeyInsights({
    submissions: severityFilteredSubmissions,
    misconceptionOverview,
    studentsAtRisk,
    trendSeries,
    interventionImpact,
  });

  const dateRange = parseDateRange(filters);

  const response: SuperDashboardResponse = {
    meta: {
      generatedAt: new Date().toISOString(),
      filters,
      timeRange: {
        from: dateRange.from ? dateRange.from.toISOString() : null,
        to: dateRange.to ? dateRange.to.toISOString() : null,
      },
      totalSubmissions: submissions.length,
      totalCompleted: completed.length,
      cache: {
        hit: false,
        key: snapshotKey,
        expiresAt: new Date(now.getTime() + SUPER_DASHBOARD_SNAPSHOT_TTL_MS).toISOString(),
      },
      modelVersion: SUPER_DASHBOARD_MODEL_VERSION,
    },
    filterOptions,
    overview,
    keyInsights,
    trendSeries,
    gapHeatmap,
    studentsAtRisk,
    topicOverview,
    misconceptionOverview,
    assignmentWeakPoints,
    interventionImpact,
    dataQuality,
  };

  await AnalyticsSnapshot.findOneAndUpdate(
    { key: snapshotKey },
    {
      $set: {
        key: snapshotKey,
        scope: 'teacher-super-dashboard',
        teacherId: filters.teacherId,
        organizationKey: filters.organizationKey,
        generatedAt: now,
        expiresAt: new Date(now.getTime() + SUPER_DASHBOARD_SNAPSHOT_TTL_MS),
        filterHash: toSnapshotFilterHash(filters),
        payload: response,
      },
    },
    { upsert: true }
  );

  return response;
}
