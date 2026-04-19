import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { Submission } from '@/lib/models/submission';
import { runAnalysisPipeline } from '@/lib/ai/pipeline';
import {
  SubmissionInputSchema,
  formatSchemaFieldErrors,
  isInvalidJsonBodyError,
  readJsonBody,
} from '@/lib/schemas';
import {
  getSubmitValidationMessage,
  hasSubmitValidationErrors,
  normalizeSubmitInput,
  toNormalizedSubmitPayload,
  validateSubmitInput,
} from '@/lib/submit-validation';
import { resolveStudentIdentity } from '@/lib/student-identity';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { createLogger, resolveRequestId } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger('api/assignments/submit', { requestId, assignmentId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid assignment id' }, { status: 400 });
  }

  try {
    const body = await readJsonBody(request);
    const parsed = SubmissionInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: 'Esituse andmed on vigased.',
          fieldErrors: formatSchemaFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const normalizedInput = normalizeSubmitInput(parsed.data);
    const validationErrors = validateSubmitInput(normalizedInput);
    if (hasSubmitValidationErrors(validationErrors)) {
      return Response.json(
        {
          error: getSubmitValidationMessage(validationErrors) || 'Esituse andmed on vigased.',
          fieldErrors: validationErrors,
        },
        { status: 400 }
      );
    }

    const submitPayload = toNormalizedSubmitPayload(normalizedInput);

    await connectDB();

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const requestContext = await resolveTeacherRequestContext(
      request,
      {
        teacherId: assignment.teacherId,
        organizationKey: assignment.organizationKey,
      },
      {
        allowFallback: true,
      }
    );
    if (!requestContext) {
      return Response.json({ error: 'Õpetaja konteksti ei leitud.' }, { status: 401 });
    }
    const studentIdentity = await resolveStudentIdentity({
      teacherId: requestContext.teacherId,
      organizationKey: requestContext.organizationKey,
      classKey: assignment.classKey,
      studentName: submitPayload.studentName,
    });

    const submission = await Submission.create({
      assignmentId: id,
      assignmentTitle: assignment.title,
      teacherId: requestContext.teacherId,
      organizationKey: requestContext.organizationKey,
      classLabel: assignment.classLabel,
      classKey: assignment.classKey,
      topic: assignment.topic,
      gradeLevel: assignment.gradeLevel,
      studentName: submitPayload.studentName,
      studentKey: studentIdentity.studentKey,
      studentIdentity: {
        rosterStudentId: studentIdentity.rosterStudentId,
        canonicalName: studentIdentity.canonicalName,
        confidence: studentIdentity.confidence,
        matchedBy: studentIdentity.matchedBy,
      },
      inputType: submitPayload.inputType,
      rawContent: submitPayload.rawContent,
      voiceMeta: parsed.data.voiceAudioBase64
        ? {
            audioMimeType: parsed.data.voiceMimeType,
            transcript: parsed.data.voiceAudioBase64,
            finalAnswer: '',
          }
        : null,
      processingStatus: 'pending',
      analysisMeta: null,
      intelligence: null,
      masterySnapshot: null,
      dataQuality: null,
      teacherReviewHistory: [],
    });

    await Assignment.findByIdAndUpdate(id, {
      $inc: { submissionCount: 1 },
    });

    const submissionId = submission._id.toString();
    log.info('submission_created', { submissionId, inputType: submitPayload.inputType });
    after(() => {
      void runAnalysisPipeline(submissionId).catch((error: unknown) => {
        log.error('pipeline_failed', { submissionId }, error);
      });
    });

    return Response.json(submission, { status: 201, headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    if (isInvalidJsonBodyError(error)) {
      return Response.json({ error: 'Vigane JSON-keha.' }, { status: 400 });
    }

    log.error('submission_create_failed', undefined, error);
    return Response.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}
