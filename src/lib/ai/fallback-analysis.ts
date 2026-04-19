import type { AnalysisResult, ExtractedStep } from '../models/submission';
import type { RawExtractedStep } from './extract-steps';

const DEFAULT_STRENGTH = ['Proovis lahendust struktureerida.'];

function detectMisconception(content: string): string {
  const lower = content.toLowerCase();

  if (/\b(divide|dividing)\b.*\bx\b|\/\s*x\b/.test(lower)) return 'QE_DIVISION_BY_X';
  if (/\bsqrt\b|√/.test(lower)) return 'QE_SQRT_BOTH_SIDES';
  if (/x\s*=\s*[^,\n]*\b(and|or)\b/i.test(content) && /-?\d/.test(content)) return 'QE_NO_ERROR';
  if (/\(\s*x\s*[+-]\s*\d+\s*\)\s*\(\s*x\s*[+-]\s*\d+\s*\)/.test(lower)) return 'QE_NO_ERROR';
  if (/[+-]\s*[+-]\s*\d/.test(lower)) return 'QE_SIGN_ERROR';
  if (/\bwrong\b|\berror\b/.test(lower)) return 'QE_ARITHMETIC';

  return 'QE_NO_ERROR';
}

function labelFor(code: string): { misconceptionLabel: string; misconceptionLabelEt: string } {
  if (code === 'QE_NO_ERROR') {
    return { misconceptionLabel: 'Correct solution', misconceptionLabelEt: 'Korrektne lahendus' };
  }

  return { misconceptionLabel: code, misconceptionLabelEt: code };
}

export function extractTypedStepsHeuristically(rawContent: string): RawExtractedStep[] {
  const chunks = rawContent
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return chunks.map((content, index) => ({
    stepNumber: index + 1,
    content,
    latex: content,
  }));
}

export function extractPhotoStepsHeuristically(): RawExtractedStep[] {
  return [
    {
      stepNumber: 1,
      content: 'Foto on esitatud. Automaatne sammude eraldamine pole saadaval, kasutati heuristilist varuanalüüsi.',
      latex: '',
    },
  ];
}

export function classifyHeuristically(
  steps: RawExtractedStep[]
): { classifiedSteps: ExtractedStep[]; analysis: AnalysisResult } {
  const classifiedSteps: ExtractedStep[] = steps.map((step) => {
    const misconceptionCode = detectMisconception(step.content);
    const isCorrect = misconceptionCode === 'QE_NO_ERROR';
    const labels = labelFor(misconceptionCode);

    return {
      stepNumber: step.stepNumber,
      content: step.content,
      latex: step.latex,
      isCorrect,
      misconceptionCode,
      misconceptionLabel: labels.misconceptionLabel,
      misconceptionLabelEt: labels.misconceptionLabelEt,
      confidence: 0.55,
      explanation: isCorrect
        ? 'Heuristiline varuanalüüs hindas selle sammu tõenäoliselt õigeks.'
        : `Heuristiline varuanalüüs tuvastas mustri: ${misconceptionCode}.`,
    };
  });

  const errorSteps = classifiedSteps.filter((step) => !step.isCorrect);
  const uniqueMisconceptions = [...new Set(errorSteps.map((step) => step.misconceptionCode || 'QE_NO_ERROR'))];
  const primaryMisconception = uniqueMisconceptions[0] || 'QE_NO_ERROR';
  const firstError = classifiedSteps.find((step) => !step.isCorrect);

  return {
    classifiedSteps,
    analysis: {
      overallCorrect: errorSteps.length === 0,
      finalAnswerCorrect: errorSteps.length === 0,
      totalSteps: classifiedSteps.length,
      correctSteps: classifiedSteps.filter((step) => step.isCorrect).length,
      firstErrorStep: firstError ? firstError.stepNumber : null,
      misconceptions: uniqueMisconceptions.filter((code) => code !== 'QE_NO_ERROR'),
      primaryMisconception,
      severityScore: errorSteps.length === 0 ? 0 : Math.min(8, 2 + errorSteps.length * 2),
      strengthAreas: DEFAULT_STRENGTH,
      reasoningType: 'procedural',
    },
  };
}
