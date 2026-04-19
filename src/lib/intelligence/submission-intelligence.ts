import { getMisconceptionDimension, getMisconceptionByCode } from "@/lib/taxonomy";

type StepLike = {
  stepNumber: number;
  isCorrect: boolean;
  confidence: number;
  misconceptionCode?: string;
  content?: string;
};
type VoiceMetaLike = {
  transcript?: string;
  finalAnswer?: string;
} | null;

type AnalysisLike = {
  primaryMisconception?: string;
  firstErrorStep?: number | null;
  finalAnswerCorrect?: boolean;
  reasoningType?: "procedural" | "conceptual" | "mixed";
};

export type SubmissionUncertaintyLevel = "low" | "medium" | "high";

export type SubmissionIntelligence = {
  firstWrongStep: number | null;
  recoveryStep: number | null;
  finalAnswerReasoningDivergence: boolean;
  dominantErrorDimension: "procedural" | "conceptual" | "mixed";
  uncertaintyLevel: SubmissionUncertaintyLevel;
  uncertaintyReasons: string[];
  reviewPriority: "low" | "medium" | "high";
  reviewPriorityScore: number;
  voiceReasoningAvailable: boolean;
  verbalReasoningDivergence: boolean;
};

export type TeacherReviewEvent = {
  at: Date;
  actor: "teacher";
  action: "reviewed" | "overridden" | "restored";
  note: string;
  fromMisconceptionCode: string | null;
  toMisconceptionCode: string | null;
};

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function resolveReviewPriority(score: number): SubmissionIntelligence["reviewPriority"] {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, score));
}

function detectRecoveryStep(steps: StepLike[], firstWrongStep: number | null): number | null {
  if (!firstWrongStep) return null;
  const sorted = [...steps]
    .filter((step) => Number.isFinite(step.stepNumber))
    .sort((left, right) => left.stepNumber - right.stepNumber);
  for (const step of sorted) {
    if (step.stepNumber <= firstWrongStep) continue;
    if (step.isCorrect) return step.stepNumber;
  }
  return null;
}

function resolveDominantErrorDimension(steps: StepLike[], primaryMisconception: string): SubmissionIntelligence["dominantErrorDimension"] {
  const errorCodes = unique(
    steps
      .filter((step) => !step.isCorrect)
      .map((step) => step.misconceptionCode || primaryMisconception || "QE_NO_ERROR")
      .filter((code) => code !== "QE_NO_ERROR")
  );

  if (errorCodes.length === 0) return "mixed";
  const dimensions = unique(errorCodes.map((code) => getMisconceptionDimension(code)));
  if (dimensions.length === 1) return dimensions[0];
  return "mixed";
}

type BuildSubmissionIntelligenceInput = {
  steps: StepLike[];
  analysis: AnalysisLike | null;
  analysisMeta?: {
    extractionSource?: "ai" | "heuristic";
    classificationSource?: "ai" | "heuristic" | "not_run";
    extractionIsComplete?: boolean;
    deterministicGateApplied?: boolean;
    averageConfidence?: number;
    lowConfidenceStepCount?: number;
  } | null;
  voiceMeta?: VoiceMetaLike;
};

function normalizeAnswerForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function buildSubmissionIntelligence(input: BuildSubmissionIntelligenceInput): SubmissionIntelligence {
  const steps = input.steps || [];
  const analysis = input.analysis;
  const meta = input.analysisMeta || null;
  const primaryMisconception = analysis?.primaryMisconception || "QE_NO_ERROR";

  const firstWrongStep =
    typeof analysis?.firstErrorStep === "number" && analysis.firstErrorStep > 0
      ? analysis.firstErrorStep
      : (steps.find((step) => !step.isCorrect)?.stepNumber || null);
  const recoveryStep = detectRecoveryStep(steps, firstWrongStep);

  const hasAnyIncorrectStep = steps.some((step) => !step.isCorrect);
  const finalAnswerCorrect = Boolean(analysis?.finalAnswerCorrect);
  const finalAnswerReasoningDivergence = hasAnyIncorrectStep && finalAnswerCorrect;

  const voiceReasoningAvailable = Boolean(input.voiceMeta?.transcript?.trim());
  const verbalReasoningDivergence =
    voiceReasoningAvailable &&
    Boolean(input.voiceMeta?.finalAnswer?.trim()) &&
    normalizeAnswerForComparison(input.voiceMeta?.finalAnswer || '') !==
      normalizeAnswerForComparison(
        steps.filter((step) => typeof step.content === 'string' && step.content.trim()).at(-1)?.content || ''
      );
  const uncertaintyReasons: string[] = [];
  let uncertaintyScore = 0;

  if (!analysis) {
    uncertaintyScore += 4;
    uncertaintyReasons.push("analysis_missing");
  }

  if (meta?.extractionSource === "heuristic") {
    uncertaintyScore += 2;
    uncertaintyReasons.push("heuristic_extraction");
  }

  if (meta?.classificationSource === "heuristic") {
    uncertaintyScore += 2;
    uncertaintyReasons.push("heuristic_classification");
  }

  if (meta?.extractionIsComplete === false) {
    uncertaintyScore += 2;
    uncertaintyReasons.push("incomplete_extraction");
  }

  if (meta?.deterministicGateApplied) {
    uncertaintyScore += 2;
    uncertaintyReasons.push("deterministic_gate");
  }

  const averageConfidence = Number(meta?.averageConfidence ?? 0);
  if (!Number.isFinite(averageConfidence) || averageConfidence < 0.55) {
    uncertaintyScore += 3;
    uncertaintyReasons.push("low_confidence");
  } else if (averageConfidence < 0.72) {
    uncertaintyScore += 1;
    uncertaintyReasons.push("medium_confidence");
  }

  if ((meta?.lowConfidenceStepCount || 0) > 0) {
    uncertaintyScore += 1;
    uncertaintyReasons.push("low_confidence_steps");
  }

  if (firstWrongStep === null && primaryMisconception !== "QE_NO_ERROR") {
    uncertaintyScore += 1;
    uncertaintyReasons.push("missing_error_anchor");
  }

  if (finalAnswerReasoningDivergence) {
    uncertaintyScore += 2;
    uncertaintyReasons.push("reasoning_answer_divergence");
  }

  if (verbalReasoningDivergence) {
    uncertaintyScore += 2;
    uncertaintyReasons.push('voice_reasoning_divergence');
  }

  const uncertaintyLevel: SubmissionUncertaintyLevel =
    uncertaintyScore >= 7 ? "high" : uncertaintyScore >= 4 ? "medium" : "low";

  let reviewPriorityScore = uncertaintyScore;
  if (primaryMisconception !== "QE_NO_ERROR") {
    const severity = getMisconceptionByCode(primaryMisconception)?.severity;
    if (severity === "fundamental") reviewPriorityScore += 2;
    else if (severity === "major") reviewPriorityScore += 1;
  }

  if (firstWrongStep !== null && firstWrongStep <= 2) {
    reviewPriorityScore += 1;
  }

  const clampedPriorityScore = clampScore(reviewPriorityScore);

  return {
    firstWrongStep,
    recoveryStep,
    finalAnswerReasoningDivergence,
    voiceReasoningAvailable,
    verbalReasoningDivergence,
    dominantErrorDimension: resolveDominantErrorDimension(steps, primaryMisconception),
    uncertaintyLevel,
    uncertaintyReasons: unique(uncertaintyReasons),
    reviewPriority: resolveReviewPriority(clampedPriorityScore),
    reviewPriorityScore: clampedPriorityScore,
  };
}
