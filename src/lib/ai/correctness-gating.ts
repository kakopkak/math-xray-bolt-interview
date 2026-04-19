import type { AnalysisResult, ExtractedStep } from '../models/submission';

type CorrectnessGateInput = {
  classifiedSteps: ExtractedStep[];
  analysis: AnalysisResult;
  answerKey: string;
  extractedFinalAnswer?: string;
  extractionIsComplete?: boolean;
};

const MIN_CONFIDENCE_FOR_AUTO_CORRECT = 0.7;
const GUARDED_MISCONCEPTION = 'QE_WRONG_METHOD';

function normalizeNumericValue(numeric: number): string {
  const rounded = Math.round(numeric * 1_000_000) / 1_000_000;
  if (Object.is(rounded, -0)) return '0';
  return rounded.toString();
}

function parseNumericToken(rawValue: string): number | null {
  const normalized = rawValue.replace(/−/g, '-').replace(/,/g, '.').trim();
  if (!normalized) return null;

  if (/^[+-]?\d+(?:\.\d+)?\/[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    const [left, right] = normalized.split('/');
    const numerator = Number(left);
    const denominator = Number(right);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function canonicalizeNumber(rawValue: string): string | null {
  const numeric = parseNumericToken(rawValue);
  if (numeric === null) return null;
  return normalizeNumericValue(numeric);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractComparableAnswers(text: string): string[] {
  if (!text.trim()) return [];

  const normalized = text.replace(/−/g, '-').replace(/,/g, '.');
  const answerTokenPattern = /(?:±|\+\/-)?\s*[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?/g;
  const assignmentValues: string[] = [];

  const assignmentMatches = [...normalized.matchAll(/[a-z]\s*=\s*([^,;\n]+)/gi)];
  for (const match of assignmentMatches) {
    const rhs = (match[1] || '').trim();
    if (!rhs) continue;

    if (rhs.startsWith('±') || rhs.startsWith('+/-')) {
      const unsigned = rhs.replace(/^±\s*|^\+\/-\s*/g, '');
      const numeric = parseNumericToken(unsigned);
      if (numeric !== null) {
        assignmentValues.push(normalizeNumericValue(Math.abs(numeric)));
        assignmentValues.push(normalizeNumericValue(-Math.abs(numeric)));
      }
      continue;
    }

    const rhsValues = [...rhs.matchAll(answerTokenPattern)]
      .map((token) => canonicalizeNumber(token[0] || ''))
      .filter((value): value is string => value !== null);
    assignmentValues.push(...rhsValues);
  }

  const setMatch = normalized.match(/\{([^}]*)\}/);
  const setValues = setMatch
    ? setMatch[1]
        .split(/[,;|]/)
        .map((token) => canonicalizeNumber(token))
        .filter((value): value is string => value !== null)
    : [];

  const chainedValues =
    assignmentValues.length > 0
      ? [...normalized.matchAll(/\b(?:or|and|või|ja|,)\s*((?:±|\+\/-)?\s*[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?)/gi)]
          .map((match) => canonicalizeNumber(match[1] || ''))
          .filter((value): value is string => value !== null)
      : [];

  const directValues = unique([...assignmentValues, ...setValues, ...chainedValues]);
  if (directValues.length > 0) {
    return directValues.sort((a, b) => Number(a) - Number(b));
  }

  const arrowSegments = normalized
    .split(/(?:->|=>|→)/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (arrowSegments.length < 2) return [];

  const tail = arrowSegments[arrowSegments.length - 1];
  const tailValues = [...tail.matchAll(/(?:±|\+\/-)?\s*[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?/g)]
    .map((match) => canonicalizeNumber(match[0] || ''))
    .filter((value): value is string => value !== null);

  return unique(tailValues).sort((a, b) => Number(a) - Number(b));
}

function areSameAnswerSet(expected: string[], actual: string[]): boolean {
  if (expected.length === 0 || actual.length === 0) return false;
  if (expected.length !== actual.length) return false;
  return expected.every((value, index) => value === actual[index]);
}

function ensureGuardedErrorStep(
  steps: ExtractedStep[],
  reason: string
): { steps: ExtractedStep[]; firstErrorStep: number | null } {
  const hasExplicitError = steps.some(
    (step) => !step.isCorrect || (step.misconceptionCode || 'QE_NO_ERROR') !== 'QE_NO_ERROR'
  );

  if (hasExplicitError) {
    const firstError = steps.find((step) => !step.isCorrect) || null;
    return { steps, firstErrorStep: firstError?.stepNumber || null };
  }

  if (steps.length === 0) {
    return { steps, firstErrorStep: null };
  }

  const updated = [...steps];
  const targetIndex = updated.length - 1;
  const current = updated[targetIndex];
  updated[targetIndex] = {
    ...current,
    isCorrect: false,
    misconceptionCode: GUARDED_MISCONCEPTION,
    misconceptionLabel: 'Insufficient certainty',
    misconceptionLabelEt: 'Ebapiisav kindlus',
    confidence: Math.min(current.confidence ?? 0.5, 0.49),
    explanation: reason,
  };

  return { steps: updated, firstErrorStep: updated[targetIndex].stepNumber };
}

export function applyDeterministicCorrectnessGate(
  input: CorrectnessGateInput
): {
  classifiedSteps: ExtractedStep[];
  analysis: AnalysisResult;
  gateApplied: boolean;
  gateReason: string;
} {
  const {
    classifiedSteps,
    analysis,
    answerKey,
    extractedFinalAnswer = '',
    extractionIsComplete = true,
  } = input;

  const expectedAnswers = extractComparableAnswers(answerKey);
  const studentAnswers = extractComparableAnswers(extractedFinalAnswer);
  const canCompareAnswers = expectedAnswers.length > 0 && studentAnswers.length > 0;
  const finalAnswerMatches = canCompareAnswers && areSameAnswerSet(expectedAnswers, studentAnswers);
  const mismatchDetected = canCompareAnswers && !finalAnswerMatches;
  const hasLowConfidence = classifiedSteps.some(
    (step) => !Number.isFinite(step.confidence) || step.confidence < MIN_CONFIDENCE_FOR_AUTO_CORRECT
  );
  const insufficientEvidence = !extractionIsComplete || classifiedSteps.length === 0 || hasLowConfidence;
  const deterministicFinalAnswerCorrect = canCompareAnswers ? finalAnswerMatches : analysis.finalAnswerCorrect;

  const claimsCorrect = analysis.overallCorrect || analysis.primaryMisconception === 'QE_NO_ERROR';
  if (!claimsCorrect || (!mismatchDetected && !insufficientEvidence)) {
    return {
      classifiedSteps,
      analysis: {
        ...analysis,
        finalAnswerCorrect: deterministicFinalAnswerCorrect,
      },
      gateApplied: false,
      gateReason: '',
    };
  }

  const guardReason = mismatchDetected
    ? 'Deterministlik lõppvastuse kontroll ei ühti ülesande vastusevõtmega.'
    : 'Klassifitseerimise kindlus või tõendus on liiga nõrk, et lugeda lahendus õigeks.';

  const guardedStepUpdate = ensureGuardedErrorStep(classifiedSteps, guardReason);
  const misconceptions = unique(
    guardedStepUpdate.steps
      .map((step) => step.misconceptionCode || 'QE_NO_ERROR')
      .filter((code) => code !== 'QE_NO_ERROR')
  );
  const primaryMisconception =
    analysis.primaryMisconception !== 'QE_NO_ERROR'
      ? analysis.primaryMisconception
      : misconceptions[0] || GUARDED_MISCONCEPTION;
  const correctSteps = guardedStepUpdate.steps.filter((step) => step.isCorrect).length;

  return {
    classifiedSteps: guardedStepUpdate.steps,
    analysis: {
      ...analysis,
      overallCorrect: false,
      finalAnswerCorrect: false,
      correctSteps,
      firstErrorStep: guardedStepUpdate.firstErrorStep,
      misconceptions,
      primaryMisconception,
      severityScore: Math.max(analysis.severityScore, mismatchDetected ? 6 : 3),
      reasoningType: analysis.reasoningType || 'procedural',
    },
    gateApplied: true,
    gateReason: guardReason,
  };
}
