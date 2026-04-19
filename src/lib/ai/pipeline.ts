import { connectDB } from '../mongodb';
import { Submission } from '../models/submission';
import { Assignment } from '../models/assignment';
import type { AnalysisMeta, AnalysisResult, ExtractedStep } from '../models/submission';
import { extractVoiceFinalAnswer } from '@/lib/voice';
import { extractStepsFromPhoto, extractStepsFromText, type RawExtractedStep } from './extract-steps';
import { classifyMisconceptions } from './classify-misconceptions';
import {
  classifyHeuristically,
  extractPhotoStepsHeuristically,
  extractTypedStepsHeuristically,
} from './fallback-analysis';
import { applyDeterministicCorrectnessGate } from './correctness-gating';
import { getErrorMessage } from './error-utils';
import { buildSubmissionIntelligence } from '@/lib/intelligence/submission-intelligence';
import { buildSubmissionMasterySnapshot } from '@/lib/intelligence/mastery-snapshot';
import { buildSubmissionDataQuality } from '@/lib/intelligence/data-quality';
import { createLogger } from '@/lib/logger';
import { transcribeVoiceBase64 } from '@/lib/ai/whisper';

/**
 * Full analysis pipeline for a single submission:
 * 1. Extract steps (vision or text)
 * 2. Classify misconceptions
 * 3. Update submission with results
 */
export async function runAnalysisPipeline(submissionId: string): Promise<void> {
  const log = createLogger('ai/pipeline', { submissionId });
  await connectDB();

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  const assignment = await Assignment.findById(submission.assignmentId);

  try {
    let voiceMeta: { audioMimeType: string; transcript: string; finalAnswer: string } | null = null;
    if (submission.voiceMeta?.audioMimeType && submission.voiceMeta.transcript) {
      try {
        const transcript = await transcribeVoiceBase64(
          submission.voiceMeta.transcript || '',
          submission.voiceMeta.audioMimeType
        );
        voiceMeta = {
          audioMimeType: submission.voiceMeta.audioMimeType,
          transcript,
          finalAnswer: extractVoiceFinalAnswer(transcript),
        };
      } catch (error) {
        log.warn('voice_transcription_fallback', { errorMessage: getErrorMessage(error) }, error);
        voiceMeta = {
          audioMimeType: submission.voiceMeta.audioMimeType,
          transcript: submission.voiceMeta.transcript || '',
          finalAnswer: submission.voiceMeta.finalAnswer || '',
        };
      }
    }
    // Step 1: Extract steps
    await Submission.findByIdAndUpdate(submissionId, { processingStatus: 'extracting' });

    const persistPartialExtraction = async (steps: RawExtractedStep[]) => {
      if (steps.length === 0) {
        return;
      }

      await Submission.findByIdAndUpdate(submissionId, {
        extractedSteps: steps.map((step) => ({
          stepNumber: step.stepNumber,
          content: step.content,
          latex: step.latex,
          isCorrect: true,
          isPartial: true,
          confidence: 0,
          explanation: 'Samm loetakse veel sisse.',
        })),
        processingStatus: 'extracting',
        processingError: '',
      });
    };

    let extractedSteps: RawExtractedStep[];
    let extractedFinalAnswer = '';
    let extractionIsComplete = true;
    let extractionSource: AnalysisMeta['extractionSource'] = 'ai';
    let classificationSource: AnalysisMeta['classificationSource'] = 'ai';
    try {
      const extractionResult =
        submission.inputType === 'photo'
          ? await extractStepsFromPhoto(submission.rawContent, {
              onPartialUpdate: async (result) => {
                await persistPartialExtraction(result.steps);
              },
            })
          : await extractStepsFromText(submission.rawContent, {
              onPartialUpdate: async (result) => {
                await persistPartialExtraction(result.steps);
              },
            });
      extractedSteps = extractionResult.steps;
      extractedFinalAnswer = extractionResult.finalAnswer;
      extractionIsComplete = extractionResult.isComplete;
    } catch (error) {
      log.warn('extraction_fallback', { errorMessage: getErrorMessage(error) }, error);
      extractionSource = 'heuristic';
      extractedSteps =
        submission.inputType === 'photo'
          ? extractPhotoStepsHeuristically()
          : extractTypedStepsHeuristically(submission.rawContent);
      extractionIsComplete = false;
    }

    if (submission.inputType === 'photo' && extractionSource === 'heuristic') {
      const analysisMeta: AnalysisMeta = {
        extractionSource,
        classificationSource: 'not_run',
        extractionIsComplete: false,
        deterministicGateApplied: false,
        deterministicGateReason: '',
        averageConfidence: 0,
        lowConfidenceStepCount: 0,
        analyzedAt: new Date(),
        pipelineVersion: '2026-04-trust-v3',
      };

      await Submission.findByIdAndUpdate(submissionId, {
        extractedSteps: [],
        analysis: null,
        analysisMeta,
        intelligence: null,
        masterySnapshot: null,
        dataQuality: buildSubmissionDataQuality({
          processingStatus: 'needs_manual_review',
          analysisMeta,
          intelligence: null,
        }),
        teacherReview: null,
        teacherReviewHistory: [],
        clusterId: null,
        processingStatus: 'needs_manual_review',
        processingError: 'Automaatne sammude eraldamine ebaõnnestus. Palun vaata lahendus käsitsi üle.',
      });
      return;
    }

    if (!extractedFinalAnswer && extractedSteps.length > 0) {
      extractedFinalAnswer = extractedSteps[extractedSteps.length - 1]?.content || '';
    }

    if (extractedSteps.length === 0) {
      await Submission.findByIdAndUpdate(submissionId, {
        processingStatus: 'error',
        processingError: 'Could not extract any steps from the solution',
        dataQuality: buildSubmissionDataQuality({
          processingStatus: 'error',
          analysisMeta: {
            extractionSource,
            classificationSource,
            extractionIsComplete,
            deterministicGateApplied: false,
            averageConfidence: 0,
            lowConfidenceStepCount: 0,
          },
          intelligence: null,
        }),
      });
      return;
    }

    // Step 2: Classify misconceptions
    await Submission.findByIdAndUpdate(submissionId, { processingStatus: 'classifying' });

    let classifiedSteps: ExtractedStep[];
    let analysis: AnalysisResult;
    try {
      const classified = await classifyMisconceptions(
        extractedSteps,
        assignment?.answerKey || '',
        assignment?.topic || 'quadratic_equations'
      );
      classifiedSteps = classified.classifiedSteps;
      analysis = classified.analysis;
    } catch (error) {
      log.warn('classification_fallback', { errorMessage: getErrorMessage(error) }, error);
      classificationSource = 'heuristic';
      const classified = classifyHeuristically(extractedSteps);
      classifiedSteps = classified.classifiedSteps;
      analysis = classified.analysis;
    }

    const gatedResult = applyDeterministicCorrectnessGate({
      classifiedSteps,
      analysis,
      answerKey: assignment?.answerKey || '',
      extractedFinalAnswer,
      extractionIsComplete,
    });
    classifiedSteps = gatedResult.classifiedSteps;
    analysis = gatedResult.analysis;

    const confidenceValues = classifiedSteps
      .map((step) => (Number.isFinite(step.confidence) ? step.confidence : 0))
      .filter((confidence) => Number.isFinite(confidence));
    const averageConfidence =
      confidenceValues.length === 0
        ? 0
        : Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(3));
    const lowConfidenceStepCount = classifiedSteps.filter(
      (step) => !Number.isFinite(step.confidence) || step.confidence < 0.7
    ).length;

    const analysisMeta: AnalysisMeta = {
      extractionSource,
      classificationSource,
      extractionIsComplete,
      deterministicGateApplied: gatedResult.gateApplied,
      deterministicGateReason: gatedResult.gateReason,
      averageConfidence,
      lowConfidenceStepCount,
      analyzedAt: new Date(),
      pipelineVersion: '2026-04-trust-v3',
    };
    const intelligence = buildSubmissionIntelligence({
      steps: classifiedSteps,
      analysis,
      analysisMeta,
      voiceMeta,
    });
    const masterySnapshot = buildSubmissionMasterySnapshot({
      analysis,
      intelligence,
    });
    const dataQuality = buildSubmissionDataQuality({
      processingStatus: 'complete',
      analysisMeta,
      intelligence,
    });

    // Step 4: Save everything
    await Submission.findByIdAndUpdate(submissionId, {
      extractedSteps: classifiedSteps,
      analysis,
      analysisMeta,
      voiceMeta,
      intelligence,
      masterySnapshot,
      dataQuality,
      teacherReview: {
        status: 'unreviewed',
        reviewedAt: null,
        note: '',
        overrideMisconceptionCode: null,
        originalMisconceptionCode: analysis.primaryMisconception,
      },
      teacherReviewHistory: [],
      processingStatus: 'complete',
      processingError: '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown pipeline error';
    await Submission.findByIdAndUpdate(submissionId, {
      processingStatus: 'error',
      processingError: message,
      dataQuality: buildSubmissionDataQuality({
        processingStatus: 'error',
        analysisMeta: null,
        intelligence: null,
      }),
    });
    throw error;
  }
}
