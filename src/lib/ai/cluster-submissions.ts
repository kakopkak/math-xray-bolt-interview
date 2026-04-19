import { getMisconceptionByCode } from '../taxonomy';
import type { ClusterSubCluster, ICluster } from '../models/cluster';
import type { ISubmission } from '../models/submission';
import { buildSubClusterLabels } from './sub-cluster-labels';

const MIN_SUB_CLUSTER_SOURCE_SIZE = 8;
const MIN_SUB_CLUSTER_SIZE = 4;
const MAX_SUB_CLUSTERS = 3;

type ErrorStepAggregate = {
  stepNumber: number;
  content: string;
  count: number;
  sampleExplanation: string;
};

type StepBucket = 'early' | 'middle' | 'late' | 'unknown';
type ErrorDimension = 'procedural' | 'conceptual' | 'mixed';

type SubClusterCandidate = {
  bucket: StepBucket;
  dominantErrorDimension: ErrorDimension;
  submissions: ISubmission[];
};

function buildEvidenceSummary(submissions: ISubmission[], code: string) {
  const relevantSubmissions = submissions.filter(
    (submission) => (submission.analysis?.primaryMisconception || 'QE_NO_ERROR') === code
  );
  if (relevantSubmissions.length === 0) {
    return {
      firstErrorStepDistribution: [],
      topErrorSteps: [],
      reasoningTypeDistribution: [],
      averageConfidence: 0,
      lowConfidenceShare: 0,
    };
  }

  const firstErrorCounts = new Map<number, number>();
  const errorStepBySignature = new Map<string, ErrorStepAggregate>();
  const confidenceValues: number[] = [];
  const reasoningTypeCounts = new Map<'procedural' | 'conceptual' | 'mixed' | 'unknown', number>();
  let lowConfidenceCount = 0;
  let confidenceCount = 0;

  for (const submission of relevantSubmissions) {
    const firstErrorStep = submission.analysis?.firstErrorStep;
    const reasoningType =
      submission.analysis?.reasoningType === 'procedural' ||
      submission.analysis?.reasoningType === 'conceptual' ||
      submission.analysis?.reasoningType === 'mixed'
        ? submission.analysis.reasoningType
        : 'unknown';
    reasoningTypeCounts.set(reasoningType, (reasoningTypeCounts.get(reasoningType) || 0) + 1);

    if (typeof firstErrorStep === 'number' && firstErrorStep > 0) {
      firstErrorCounts.set(firstErrorStep, (firstErrorCounts.get(firstErrorStep) || 0) + 1);
    }

    for (const step of submission.extractedSteps || []) {
      if ((step.misconceptionCode || 'QE_NO_ERROR') !== code) continue;

      const signature = `${step.stepNumber}::${step.content.trim()}`;
      const existing = errorStepBySignature.get(signature);
      if (existing) {
        existing.count += 1;
        if (!existing.sampleExplanation && step.explanation) {
          existing.sampleExplanation = step.explanation;
        }
      } else {
        errorStepBySignature.set(signature, {
          stepNumber: step.stepNumber,
          content: step.content,
          count: 1,
          sampleExplanation: step.explanation || '',
        });
      }
    }

    for (const step of submission.extractedSteps || []) {
      if (!Number.isFinite(step.confidence)) continue;
      confidenceValues.push(step.confidence);
      confidenceCount += 1;
      if (step.confidence < 0.7) {
        lowConfidenceCount += 1;
      }
    }
  }

  const denominator = Math.max(relevantSubmissions.length, 1);
  const firstErrorStepDistribution = [...firstErrorCounts.entries()]
    .map(([stepNumber, count]) => ({
      stepNumber,
      count,
      percentage: Number(((count / denominator) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || a.stepNumber - b.stepNumber)
    .slice(0, 4);

  const topErrorSteps = [...errorStepBySignature.values()]
    .sort((a, b) => b.count - a.count || a.stepNumber - b.stepNumber)
    .slice(0, 5)
    .map((entry) => ({
      stepNumber: entry.stepNumber,
      content: entry.content,
      count: entry.count,
      percentage: Number(((entry.count / denominator) * 100).toFixed(1)),
      sampleExplanation: entry.sampleExplanation,
    }));

  const averageConfidence =
    confidenceValues.length === 0
      ? 0
      : Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(3));
  const lowConfidenceShare =
    confidenceCount === 0 ? 0 : Number(((lowConfidenceCount / confidenceCount) * 100).toFixed(1));

  const reasoningTypeDistribution = [...reasoningTypeCounts.entries()]
    .map(([reasoningType, count]) => ({
      reasoningType,
      count,
      percentage: Number(((count / denominator) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    firstErrorStepDistribution,
    topErrorSteps,
    reasoningTypeDistribution,
    averageConfidence,
    lowConfidenceShare,
  };
}

function toStepBucket(firstWrongStep: number | null): StepBucket {
  if (typeof firstWrongStep !== 'number' || firstWrongStep <= 0) return 'unknown';
  if (firstWrongStep <= 2) return 'early';
  if (firstWrongStep <= 4) return 'middle';
  return 'late';
}

function resolveFirstWrongStep(submission: ISubmission): number | null {
  if (typeof submission.intelligence?.firstWrongStep === 'number') {
    return submission.intelligence.firstWrongStep;
  }
  if (typeof submission.analysis?.firstErrorStep === 'number') {
    return submission.analysis.firstErrorStep;
  }
  return null;
}

function resolveDominantErrorDimension(submission: ISubmission): ErrorDimension {
  if (
    submission.intelligence?.dominantErrorDimension === 'procedural' ||
    submission.intelligence?.dominantErrorDimension === 'conceptual' ||
    submission.intelligence?.dominantErrorDimension === 'mixed'
  ) {
    return submission.intelligence.dominantErrorDimension;
  }
  if (
    submission.analysis?.reasoningType === 'procedural' ||
    submission.analysis?.reasoningType === 'conceptual' ||
    submission.analysis?.reasoningType === 'mixed'
  ) {
    return submission.analysis.reasoningType;
  }
  return 'mixed';
}

function buildRepresentativeExample(submissions: ISubmission[], code: string): string {
  for (const submission of submissions) {
    const matchingStep = submission.extractedSteps.find(
      (step) => (step.misconceptionCode || 'QE_NO_ERROR') === code
    );
    if (matchingStep?.content) {
      return matchingStep.content;
    }
  }
  return '';
}

function buildSubClusters(submissions: ISubmission[], code: string): ClusterSubCluster[] {
  if (code === 'QE_NO_ERROR' || submissions.length < MIN_SUB_CLUSTER_SOURCE_SIZE) {
    return [];
  }

  const groupedCandidates = new Map<string, SubClusterCandidate>();
  for (const submission of submissions) {
    const dominantErrorDimension = resolveDominantErrorDimension(submission);
    const bucket = toStepBucket(resolveFirstWrongStep(submission));
    const key = `${dominantErrorDimension}:${bucket}`;
    const current = groupedCandidates.get(key);
    if (current) {
      current.submissions.push(submission);
    } else {
      groupedCandidates.set(key, {
        bucket,
        dominantErrorDimension,
        submissions: [submission],
      });
    }
  }

  const selectedGroups = [...groupedCandidates.values()]
    .filter((group) => group.submissions.length >= MIN_SUB_CLUSTER_SIZE)
    .sort((left, right) => {
      if (right.submissions.length !== left.submissions.length) {
        return right.submissions.length - left.submissions.length;
      }
      const leftKey = `${left.dominantErrorDimension}:${left.bucket}`;
      const rightKey = `${right.dominantErrorDimension}:${right.bucket}`;
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, MAX_SUB_CLUSTERS);

  if (selectedGroups.length < 2) {
    return [];
  }

  return selectedGroups.map((group, index) => {
    const labels = buildSubClusterLabels({
      misconceptionCode: code,
      dominantErrorDimension: group.dominantErrorDimension,
      firstWrongStepBucket: group.bucket,
    });
    return {
      id: `${code.toLowerCase()}-sub-${index + 1}`,
      label: labels.label,
      labelEt: labels.labelEt,
      size: group.submissions.length,
      memberSubmissionIds: group.submissions.map((submission) => submission._id.toString()),
      memberStudentNames: group.submissions.map((submission) => submission.studentName),
      representativeExample: buildRepresentativeExample(group.submissions, code),
      dominantPattern: labels.dominantPattern,
      remediationHint: labels.remediationHint,
    };
  });
}

/**
 * Cluster submissions by their primary misconception code.
 * For the demo build, misconception-label grouping is the honest clustering model.
 */
export function clusterByMisconception(
  submissions: ISubmission[]
): Omit<ICluster, keyof Document | '_id' | 'createdAt'>[] {
  const groups = new Map<string, ISubmission[]>();

  for (const sub of submissions) {
    const code = sub.analysis?.primaryMisconception || 'QE_NO_ERROR';
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code)!.push(sub);
  }

  const clusters: Omit<ICluster, keyof Document | '_id' | 'createdAt'>[] = [];

  for (const [code, subs] of groups.entries()) {
    const taxonomy = getMisconceptionByCode(code);

    clusters.push({
      assignmentId: subs[0].assignmentId,
      misconceptionCode: code,
      label: taxonomy?.label || code,
      labelEt: taxonomy?.labelEt || code,
      description: taxonomy?.description || '',
      descriptionEt: taxonomy?.descriptionEt || '',
      severity: code === 'QE_NO_ERROR' ? 'none' : (taxonomy?.severity || 'major'),
      studentSubmissionIds: subs.map((s) => s._id.toString()),
      studentNames: subs.map((s) => s.studentName),
      clusterSize: subs.length,
      commonPattern: buildCommonPattern(subs, code),
      evidenceSummary: buildEvidenceSummary(subs, code),
      subClusters: buildSubClusters(subs, code),
      remediationExercises: [],
      remediationStatus: code === 'QE_NO_ERROR' ? 'ready' : 'pending',
      remediationError: '',
    } as unknown as Omit<ICluster, keyof Document | '_id' | 'createdAt'>);
  }

  return clusters;
}

function buildCommonPattern(submissions: ISubmission[], code: string): string {
  if (code === 'QE_NO_ERROR') return 'Kõik sammud on korrektsed — väärarusaamu ei tuvastatud.';

  const errorSteps = submissions
    .flatMap((submission) => submission.extractedSteps)
    .filter((step) => step.misconceptionCode === code);

  if (errorSteps.length === 0) return `Tuvastatud väärarusaam: ${code}`;

  const explanations = errorSteps
    .map((step) => step.explanation)
    .filter(Boolean);

  return explanations[0] || `Õpilastel kordub sama väärarusaama muster: ${code}.`;
}