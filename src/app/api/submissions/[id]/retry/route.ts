import mongoose from 'mongoose';
import { after } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { runAnalysisPipeline } from '@/lib/ai/pipeline';
import { ACTIVE_SUBMISSION_PROCESSING_STATUSES } from '@/lib/submission-status';
import { createLogger, resolveRequestId } from '@/lib/logger';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { findTeacherSubmissionById } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ACTIVE_PIPELINE_STATUSES = new Set(
  ACTIVE_SUBMISSION_PROCESSING_STATUSES.filter((status) => status !== 'pending')
);

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger('api/submissions/retry', { requestId, submissionId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const submission = await findTeacherSubmissionById(id, context);
  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (ACTIVE_PIPELINE_STATUSES.has(submission.processingStatus)) {
    return Response.json(
      { error: `Submission is already processing (${submission.processingStatus})` },
      { status: 409 }
    );
  }

  await submission.updateOne({
    processingStatus: 'pending',
    processingError: '',
    extractedSteps: [],
    analysis: null,
    analysisMeta: null,
    intelligence: null,
    teacherReview: null,
    teacherReviewHistory: [],
    clusterId: null,
  });

  log.info('submission_retry', {});
  after(() => {
    void runAnalysisPipeline(id).catch((error: unknown) => {
      log.error('retry_pipeline_failed', undefined, error);
    });
  });

  return Response.json({ submissionId: id, processingStatus: 'pending' }, {
    headers: { 'X-Request-Id': requestId },
  });
}
