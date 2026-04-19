import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { buildSubmissionIntelligence } from '@/lib/intelligence/submission-intelligence';
import { buildSubmissionMasterySnapshot } from '@/lib/intelligence/mastery-snapshot';
import { buildSubmissionDataQuality } from '@/lib/intelligence/data-quality';
import {
  ReviewOverrideSchema,
  formatSchemaFieldErrors,
  isInvalidJsonBodyError,
  readOptionalJsonBody,
} from '@/lib/schemas';
import { getMisconceptionByCode } from '@/lib/taxonomy';
import { createLogger, resolveRequestId } from '@/lib/logger';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { findTeacherSubmissionById } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger('api/submissions/review', { requestId, submissionId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Vigane esituse ID.' }, { status: 400 });
  }

  try {
    const body = await readOptionalJsonBody(request);
    const parsed = ReviewOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: 'Õpetaja ülevaatuse andmed on vigased.',
          fieldErrors: formatSchemaFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const { note, overrideMisconceptionCode } = parsed.data;

    await connectDB();
    const context = await resolveTeacherRequestContext(request);
    if (!context) {
      return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
    }

    const submission = await findTeacherSubmissionById(id, context);
    if (!submission) {
      return Response.json({ error: 'Esitust ei leitud.' }, { status: 404 });
    }

    if (!submission.analysis) {
      return Response.json({ error: 'Esitus pole veel analüüsitud.' }, { status: 409 });
    }

    const originalMisconceptionCode = submission.analysis.primaryMisconception || 'QE_NO_ERROR';
    const hasOverride = Boolean(
      overrideMisconceptionCode && overrideMisconceptionCode !== originalMisconceptionCode
    );
    const fromMisconceptionCode = submission.analysis.primaryMisconception || null;

    if (hasOverride && overrideMisconceptionCode) {
      const taxonomy = getMisconceptionByCode(overrideMisconceptionCode);
      submission.analysis.primaryMisconception = overrideMisconceptionCode;
      submission.analysis.misconceptions = Array.from(
        new Set([...(submission.analysis.misconceptions || []), overrideMisconceptionCode])
      );

      if (submission.extractedSteps.length > 0) {
        const firstIncorrectIndex = submission.extractedSteps.findIndex(
          (step: { isCorrect: boolean }) => !step.isCorrect
        );
        if (firstIncorrectIndex >= 0) {
          const step = submission.extractedSteps[firstIncorrectIndex];
          step.misconceptionCode = overrideMisconceptionCode;
          step.misconceptionLabel = taxonomy?.label || overrideMisconceptionCode;
          step.misconceptionLabelEt = taxonomy?.labelEt || overrideMisconceptionCode;
        }
      }
    }

    submission.teacherReview = {
      status: hasOverride ? 'overridden' : 'reviewed',
      reviewedAt: new Date(),
      note,
      overrideMisconceptionCode: hasOverride ? overrideMisconceptionCode : null,
      originalMisconceptionCode,
    };

    submission.teacherReviewHistory = [
      ...(submission.teacherReviewHistory || []),
      {
        at: new Date(),
        actor: 'teacher',
        action: hasOverride
          ? overrideMisconceptionCode === submission.teacherReview?.originalMisconceptionCode
            ? 'restored'
            : 'overridden'
          : 'reviewed',
        note,
        fromMisconceptionCode,
        toMisconceptionCode: submission.analysis.primaryMisconception || null,
      },
    ];

    submission.intelligence = buildSubmissionIntelligence({
      steps: submission.extractedSteps || [],
      analysis: submission.analysis,
      analysisMeta: submission.analysisMeta,
    });
    submission.masterySnapshot = buildSubmissionMasterySnapshot({
      analysis: submission.analysis,
      intelligence: submission.intelligence,
    });
    submission.dataQuality = buildSubmissionDataQuality({
      processingStatus: submission.processingStatus,
      analysisMeta: submission.analysisMeta,
      intelligence: submission.intelligence,
    });

    await submission.save();

    return Response.json({
      submissionId: String(submission._id),
      teacherReview: submission.teacherReview,
      teacherReviewHistory: submission.teacherReviewHistory,
      intelligence: submission.intelligence,
      primaryMisconception: submission.analysis.primaryMisconception,
    });
  } catch (error) {
    if (isInvalidJsonBodyError(error)) {
      return Response.json({ error: 'Vigane JSON-keha.' }, { status: 400 });
    }

    log.error('teacher_review_failed', undefined, error);
    return Response.json({ error: 'Õpetaja ülevaate salvestamine ebaõnnestus.' }, { status: 500 });
  }
}
