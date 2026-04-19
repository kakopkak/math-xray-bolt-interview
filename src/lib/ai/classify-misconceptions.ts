import { getMisconceptionByCode, getTaxonomyCodesString } from '../taxonomy';
import type { RawExtractedStep } from './extract-steps';
import type { ExtractedStep, AnalysisResult } from '../models/submission';
import { getErrorMessage } from './error-utils';
import { getOpenAIClient } from './openai-client';
import { isRetryableAIError, withRetry } from './retry';

const OPENAI_TIMEOUT_MS = 30_000;
const CONSERVATIVE_FALLBACK_SEVERITY = 6;

function buildClassificationPrompt(
  steps: RawExtractedStep[],
  answerKey: string,
  topic: string
): string {
  const taxonomyCodes = getTaxonomyCodesString(topic);

  return `You are an expert mathematics educator analyzing a student's step-by-step solution for misconceptions.

AVAILABLE MISCONCEPTION CODES:
${taxonomyCodes}

STUDENT'S STEPS:
${steps.map((s) => `Step ${s.stepNumber}: ${s.content}`).join('\n')}

${answerKey ? `CORRECT APPROACH / ANSWER KEY:\n${answerKey}\n` : ''}

For each step, classify whether it is correct or contains a misconception.
Return ONLY valid JSON (no markdown), with this structure:
{
  "steps": [
    {
      "stepNumber": 1,
      "isCorrect": true,
      "misconceptionCode": "QE_NO_ERROR",
      "misconceptionLabel": "Correct",
      "misconceptionLabelEt": "Korrektne",
      "confidence": 0.95,
      "explanation": "Brief explanation of why this step is correct or what went wrong"
    }
  ],
  "primaryMisconception": "QE_NO_ERROR or the most significant error code",
  "overallCorrect": true,
  "finalAnswerCorrect": true,
  "severityScore": 0,
  "strengthAreas": ["what the student did well"],
  "reasoningType": "procedural"
}

Rules:
- Use ONLY codes from the list above
- If a step is correct, use QE_NO_ERROR
- severityScore: 0 = perfect, 1-3 = minor issues, 4-6 = major gap, 7-10 = fundamental misunderstanding
- reasoningType: "procedural" = following memorized steps, "conceptual" = shows understanding, "mixed" = both
- Be precise about WHERE the error occurs
- All learner-facing text fields MUST be in Estonian:
  - misconceptionLabelEt
  - explanation
  - strengthAreas`;
}

export async function classifyMisconceptions(
  steps: RawExtractedStep[],
  answerKey: string,
  topic = 'quadratic_equations'
): Promise<{ classifiedSteps: ExtractedStep[]; analysis: AnalysisResult }> {
  const prompt = buildClassificationPrompt(steps, answerKey, topic);
  const openai = getOpenAIClient(OPENAI_TIMEOUT_MS);

  const response = await withRetry(
    () =>
      openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 3000,
        },
        { timeout: OPENAI_TIMEOUT_MS }
      ),
    {
      shouldRetry: isRetryableAIError,
      onRetry: (error, nextAttempt, delayMs) => {
        console.warn('Classification request retrying.', {
          errorMessage: getErrorMessage(error),
          nextAttempt,
          delayMs,
        });
      },
    }
  );

  const text = response.choices[0]?.message?.content || '{}';

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const classifiedSteps: ExtractedStep[] = (parsed.steps || []).map(
      (s: Record<string, unknown>, i: number) => ({
        stepNumber: (s.stepNumber as number) || i + 1,
        content: steps[i]?.content || '',
        latex: steps[i]?.latex,
        isCorrect: s.isCorrect as boolean ?? true,
        misconceptionCode: (s.misconceptionCode as string) || 'QE_NO_ERROR',
        misconceptionLabel: (s.misconceptionLabel as string) || '',
        misconceptionLabelEt: (s.misconceptionLabelEt as string) || '',
        confidence: (s.confidence as number) || 0.5,
        explanation: (s.explanation as string) || '',
      })
    );

    const misconceptions = classifiedSteps
      .filter((s) => s.misconceptionCode !== 'QE_NO_ERROR')
      .map((s) => s.misconceptionCode || '');
    const uniqueMisconceptions = [...new Set(misconceptions)];

    const analysis: AnalysisResult = {
      overallCorrect: parsed.overallCorrect ?? classifiedSteps.every((s) => s.isCorrect),
      finalAnswerCorrect: parsed.finalAnswerCorrect ?? false,
      totalSteps: classifiedSteps.length,
      correctSteps: classifiedSteps.filter((s) => s.isCorrect).length,
      firstErrorStep:
        classifiedSteps.findIndex((s) => !s.isCorrect) >= 0
          ? classifiedSteps.findIndex((s) => !s.isCorrect) + 1
          : null,
      misconceptions: uniqueMisconceptions,
      primaryMisconception: parsed.primaryMisconception || 'QE_NO_ERROR',
      severityScore: parsed.severityScore ?? 0,
      strengthAreas: parsed.strengthAreas || [],
      reasoningType: parsed.reasoningType || 'procedural',
    };

    return { classifiedSteps, analysis };
  } catch (error) {
    console.warn('Classification response parsing failed; applying conservative fallback labels.', {
      errorMessage: getErrorMessage(error),
    });
    const fallbackMisconceptionCode = 'QE_WRONG_METHOD';
    const fallbackMisconception = getMisconceptionByCode(fallbackMisconceptionCode);
    const fallbackExplanation = 'Klassifitseerimine ebaõnnestus; kasutati konservatiivset veamärgistust.';

    const classifiedSteps: ExtractedStep[] = steps.map((s) => ({
      ...s,
      isCorrect: false,
      misconceptionCode: fallbackMisconceptionCode,
      misconceptionLabel: fallbackMisconception?.label || 'Classification unavailable',
      misconceptionLabelEt: fallbackMisconception?.labelEt || 'Klassifitseerimine pole saadaval',
      confidence: 0,
      explanation: fallbackExplanation,
    }));

    return {
      classifiedSteps,
      analysis: {
        overallCorrect: false,
        finalAnswerCorrect: false,
        totalSteps: steps.length,
        correctSteps: 0,
        firstErrorStep: steps[0]?.stepNumber || null,
        misconceptions: steps.length > 0 ? [fallbackMisconceptionCode] : [],
        primaryMisconception: fallbackMisconceptionCode,
        severityScore: CONSERVATIVE_FALLBACK_SEVERITY,
        strengthAreas: [],
        reasoningType: 'procedural',
      },
    };
  }
}
