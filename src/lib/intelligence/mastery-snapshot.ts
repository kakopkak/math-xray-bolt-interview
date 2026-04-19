import { getMisconceptionByCode } from '@/lib/taxonomy';

type AnalysisLike = {
  primaryMisconception?: string;
  severityScore?: number;
  finalAnswerCorrect?: boolean;
} | null;

type IntelligenceLike = {
  dominantErrorDimension?: 'procedural' | 'conceptual' | 'mixed';
  finalAnswerReasoningDivergence?: boolean;
  firstWrongStep?: number | null;
} | null;

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export type SubmissionMasterySnapshot = {
  topicMasteryScore: number;
  misconceptionPressureScore: number;
  conceptualGapScore: number;
  proceduralGapScore: number;
};

export function buildSubmissionMasterySnapshot(input: {
  analysis: AnalysisLike;
  intelligence?: IntelligenceLike;
}): SubmissionMasterySnapshot {
  const analysis = input.analysis;
  const intelligence = input.intelligence || null;

  if (!analysis) {
    return {
      topicMasteryScore: 0,
      misconceptionPressureScore: 0,
      conceptualGapScore: 0,
      proceduralGapScore: 0,
    };
  }

  const primary = analysis.primaryMisconception || 'QE_NO_ERROR';
  const severityScore = Math.max(0, Math.min(10, Number(analysis.severityScore ?? 0)));
  const taxonomy = getMisconceptionByCode(primary);
  const dimension = intelligence?.dominantErrorDimension || taxonomy?.dimension || 'mixed';
  const finalAnswerCorrect = Boolean(analysis.finalAnswerCorrect);
  const divergence = Boolean(intelligence?.finalAnswerReasoningDivergence);
  const firstWrongStep = intelligence?.firstWrongStep ?? null;

  let pressure = severityScore * 9;
  if (primary !== 'QE_NO_ERROR') {
    pressure += 14;
  }
  if (divergence) {
    pressure += 10;
  }
  if (firstWrongStep !== null && firstWrongStep <= 2) {
    pressure += 8;
  }

  if (finalAnswerCorrect && primary === 'QE_NO_ERROR') {
    pressure = Math.max(0, pressure - 12);
  }

  const misconceptionPressureScore = clamp(pressure);
  const topicMasteryScore = clamp(100 - misconceptionPressureScore + (finalAnswerCorrect ? 6 : 0));

  const conceptualGapScore = clamp(
    dimension === 'conceptual' || dimension === 'mixed'
      ? misconceptionPressureScore + (divergence ? 8 : 0)
      : misconceptionPressureScore * 0.45
  );

  const proceduralGapScore = clamp(
    dimension === 'procedural' || dimension === 'mixed'
      ? misconceptionPressureScore + (firstWrongStep !== null && firstWrongStep <= 2 ? 6 : 0)
      : misconceptionPressureScore * 0.45
  );

  return {
    topicMasteryScore,
    misconceptionPressureScore,
    conceptualGapScore,
    proceduralGapScore,
  };
}
