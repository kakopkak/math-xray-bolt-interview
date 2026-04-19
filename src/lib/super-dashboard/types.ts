import type { AssignmentTopic } from '@/lib/taxonomy';

export type SuperDashboardSeverityFilter = 'minor' | 'major' | 'fundamental';

export type SuperDashboardFilters = {
  teacherId: string;
  organizationKey: string;
  classKey?: string | null;
  assignmentId?: string | null;
  topic?: AssignmentTopic | null;
  studentKey?: string | null;
  misconceptionCode?: string | null;
  severity?: SuperDashboardSeverityFilter | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type SuperDashboardKeyInsight = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  dimension: 'procedural' | 'conceptual' | 'mixed';
};

export type SuperDashboardTrendPoint = {
  bucket: string;
  total: number;
  masteryRate: number;
  conceptualGap: number;
  proceduralGap: number;
  divergenceRate: number;
  highRiskCount: number;
};

export type SuperDashboardHeatmapCell = {
  studentKey: string;
  misconceptionCode: string;
  count: number;
  risk: number;
};

export type SuperDashboardResponse = {
  meta: {
    generatedAt: string;
    filters: SuperDashboardFilters;
    timeRange: {
      from: string | null;
      to: string | null;
    };
    totalSubmissions: number;
    totalCompleted: number;
    cache: {
      hit: boolean;
      key: string;
      expiresAt: string | null;
    };
    modelVersion: string;
  };
  filterOptions: {
    classes: Array<{ classKey: string; classLabel: string; count: number }>;
    assignments: Array<{
      assignmentId: string;
      title: string;
      classKey: string;
      classLabel: string;
      topic: AssignmentTopic;
      submissionCount: number;
      createdAt: string;
    }>;
    topics: Array<{ topic: AssignmentTopic; labelEt: string; count: number }>;
    students: Array<{ studentKey: string; studentName: string; submissionCount: number }>;
    misconceptions: Array<{ code: string; labelEt: string; count: number }>;
    severities: Array<SuperDashboardSeverityFilter>;
  };
  overview: {
    classCount: number;
    assignmentCount: number;
    studentCount: number;
    masteryRate: number;
    unresolvedHighRiskCount: number;
    conceptualShare: number;
    proceduralShare: number;
    recurringGapStudents: number;
    recoveryFailureCount: number;
    strongestTopics: Array<{ topic: AssignmentTopic; labelEt: string; masteryScore: number }>;
    weakestTopics: Array<{ topic: AssignmentTopic; labelEt: string; masteryScore: number }>;
    topMisconceptions: Array<{ code: string; labelEt: string; count: number }>;
  };
  keyInsights: SuperDashboardKeyInsight[];
  trendSeries: SuperDashboardTrendPoint[];
  gapHeatmap: {
    students: Array<{ studentKey: string; studentName: string; riskScore: number }>;
    misconceptions: Array<{ code: string; labelEt: string }>;
    cells: SuperDashboardHeatmapCell[];
  };
  studentsAtRisk: Array<{
    studentKey: string;
    studentName: string;
    classLabel: string;
    assignmentCount: number;
    submissionCount: number;
    riskScore: number;
    trend: 'improving' | 'stable' | 'worsening';
    topMisconceptionCode: string | null;
    topMisconceptionLabelEt: string | null;
    recurringMisconceptionCount: number;
    earlyBreakdownCount: number;
    divergenceCount: number;
    highPriorityUnreviewedCount: number;
    trustLevel: "high" | "medium" | "low";
    extractionSource: "ai" | "heuristic";
    recommendation: string;
    latestSubmissionId: string | null;
  }>;
  topicOverview: Array<{
    topic: AssignmentTopic;
    labelEt: string;
    submissionCount: number;
    completedCount: number;
    masteryScore: number;
    gapRate: number;
    conceptualShare: number;
    proceduralShare: number;
    trendDelta: number;
  }>;
  misconceptionOverview: Array<{
    code: string;
    labelEt: string;
    severity: 'minor' | 'major' | 'fundamental';
    dimension: 'procedural' | 'conceptual' | 'mixed';
    count: number;
    studentCount: number;
    share: number;
    trendDelta: number;
    growing: boolean;
  }>;
  assignmentWeakPoints: Array<{
    assignmentId: string;
    assignmentTitle: string;
    classLabel: string;
    topic: AssignmentTopic;
    submissionCount: number;
    gapRate: number;
    highSeverityShare: number;
    divergenceShare: number;
    pressureScore: number;
    topMisconceptionCode: string | null;
    topMisconceptionLabelEt: string | null;
    createdAt: string;
  }>;
  interventionImpact: {
    trackedCount: number;
    improvedCount: number;
    unchangedCount: number;
    worsenedCount: number;
    unknownCount: number;
    improvedShare: number;
    byType: Array<{
      interventionType: string;
      count: number;
      improvedShare: number;
    }>;
  };
  dataQuality: {
    averageSignalQuality: number;
    trustLevelDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    lowTrustShare: number;
    lowTrustStudentCount: number;
    topReasons: Array<{ reason: string; count: number }>;
  };
};
