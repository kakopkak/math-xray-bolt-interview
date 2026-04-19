type AnalysisMetaLike = {
  extractionSource?: 'ai' | 'heuristic';
  classificationSource?: 'ai' | 'heuristic' | 'not_run';
  extractionIsComplete?: boolean;
  deterministicGateApplied?: boolean;
  averageConfidence?: number;
  lowConfidenceStepCount?: number;
} | null;

type IntelligenceLike = {
  uncertaintyLevel?: 'low' | 'medium' | 'high';
  uncertaintyReasons?: string[];
} | null;

export type SubmissionDataQuality = {
  signalQualityScore: number;
  trustLevel: 'high' | 'medium' | 'low';
  reasons: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function buildSubmissionDataQuality(input: {
  processingStatus: string;
  analysisMeta?: AnalysisMetaLike;
  intelligence?: IntelligenceLike;
}): SubmissionDataQuality {
  const reasons: string[] = [];
  let score = 100;

  if (input.processingStatus === 'needs_manual_review') {
    score -= 45;
    reasons.push('manual_review_required');
  }

  if (input.processingStatus === 'error') {
    score -= 55;
    reasons.push('analysis_error');
  }

  const meta = input.analysisMeta;
  if (meta?.extractionSource === 'heuristic') {
    score -= 18;
    reasons.push('heuristic_extraction');
  }
  if (meta?.classificationSource === 'heuristic') {
    score -= 14;
    reasons.push('heuristic_classification');
  }
  if (meta?.classificationSource === 'not_run') {
    score -= 20;
    reasons.push('classification_not_run');
  }
  if (meta?.extractionIsComplete === false) {
    score -= 12;
    reasons.push('incomplete_extraction');
  }
  if (meta?.deterministicGateApplied) {
    score -= 6;
    reasons.push('deterministic_gate_applied');
  }

  const averageConfidence = Number(meta?.averageConfidence ?? 0);
  if (!Number.isFinite(averageConfidence) || averageConfidence < 0.45) {
    score -= 20;
    reasons.push('low_confidence');
  } else if (averageConfidence < 0.62) {
    score -= 10;
    reasons.push('medium_confidence');
  } else if (averageConfidence < 0.75) {
    score -= 4;
    reasons.push('moderate_confidence');
  }

  if ((meta?.lowConfidenceStepCount || 0) > 0) {
    score -= Math.min(12, (meta?.lowConfidenceStepCount || 0) * 2);
    reasons.push('low_confidence_steps');
  }

  const uncertainty = input.intelligence?.uncertaintyLevel;
  if (uncertainty === 'high') {
    score -= 14;
    reasons.push('high_uncertainty');
  } else if (uncertainty === 'medium') {
    score -= 7;
    reasons.push('medium_uncertainty');
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);
  const trustLevel: SubmissionDataQuality['trustLevel'] =
    normalizedScore >= 76 ? 'high' : normalizedScore >= 48 ? 'medium' : 'low';

  return {
    signalQualityScore: normalizedScore,
    trustLevel,
    reasons: unique([
      ...reasons,
      ...(input.intelligence?.uncertaintyReasons || []),
    ]),
  };
}
