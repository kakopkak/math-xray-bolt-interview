import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/lib/models/submission';
import {
  PIPELINE_TIMEOUT_REASON,
  PIPELINE_TIMEOUT_STALE_MS,
} from '@/lib/pipeline-timeout';
import { ACTIVE_SUBMISSION_PROCESSING_STATUSES } from '@/lib/submission-status';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { teacherTenantFilter } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - PIPELINE_TIMEOUT_STALE_MS);
  const swept = await Submission.findOneAndUpdate(
    {
      _id: id,
      ...teacherTenantFilter(context),
      processingStatus: { $in: ACTIVE_SUBMISSION_PROCESSING_STATUSES },
      updatedAt: { $lt: staleBefore },
    },
    {
      $set: {
        extractedSteps: [],
        analysis: null,
        analysisMeta: null,
        intelligence: null,
        teacherReview: null,
        teacherReviewHistory: [],
        clusterId: null,
        processingStatus: 'needs_manual_review',
        processingError: PIPELINE_TIMEOUT_REASON,
      },
    },
    { new: true }
  ).select('_id processingStatus processingError');

  if (swept) {
    return Response.json({
      submissionId: String(swept._id),
      processingStatus: swept.processingStatus,
      processingError: swept.processingError,
      swept: true,
    });
  }

  const submission = await Submission.findOne({
    _id: id,
    ...teacherTenantFilter(context),
  }).select(
    '_id processingStatus processingError'
  );
  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  return Response.json({
    submissionId: String(submission._id),
    processingStatus: submission.processingStatus,
    processingError: submission.processingError,
    swept: false,
  });
}
