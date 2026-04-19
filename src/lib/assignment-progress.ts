import mongoose from 'mongoose';
import { Submission } from '@/lib/models/submission';
import type { TeacherRequestContext } from '@/lib/request-context';
import {
  ACTIVE_SUBMISSION_PROCESSING_STATUSES,
  SUBMISSION_PROCESSING_STATUSES,
  type SubmissionProcessingStatus,
} from '@/lib/submission-status';
import { teacherTenantFilter } from '@/lib/teacher-scope';

export type AssignmentProgressSummary = {
  assignmentId: string;
  totalSubmissions: number;
  statusCounts: Record<SubmissionProcessingStatus, number>;
  inFlightCount: number;
  needsManualReviewCount: number;
  completeCount: number;
  errorCount: number;
  reviewedCount: number;
  overriddenCount: number;
  unreviewedCompleteCount: number;
  highPriorityReviewCount: number;
  highUncertaintyCount: number;
  readyForClustering: boolean;
  latestSubmissionAt: string | null;
};

function emptyStatusCounts(): Record<SubmissionProcessingStatus, number> {
  return {
    pending: 0,
    extracting: 0,
    classifying: 0,
    needs_manual_review: 0,
    complete: 0,
    error: 0,
  };
}

export async function getAssignmentProgressSummary(
  assignmentId: string,
  context?: TeacherRequestContext
): Promise<AssignmentProgressSummary> {
  const assignmentObjectId = new mongoose.Types.ObjectId(assignmentId);
  const matchFilter = {
    assignmentId: assignmentObjectId,
    ...(context ? teacherTenantFilter(context) : {}),
  };
  const [statusRows, reviewRows, intelligenceRows, latestSubmission] = await Promise.all([
    Submission.aggregate<{ _id: SubmissionProcessingStatus; count: number }>([
      { $match: matchFilter },
      { $group: { _id: '$processingStatus', count: { $sum: 1 } } },
    ]),
    Submission.aggregate<{ _id: 'unreviewed' | 'reviewed' | 'overridden' | null; count: number }>([
      { $match: { ...matchFilter, processingStatus: 'complete' } },
      { $group: { _id: '$teacherReview.status', count: { $sum: 1 } } },
    ]),
    Submission.aggregate<{
      _id: { priority: 'low' | 'medium' | 'high' | null; uncertainty: 'low' | 'medium' | 'high' | null };
      count: number;
    }>([
      { $match: { ...matchFilter, processingStatus: 'complete' } },
      {
        $group: {
          _id: {
            priority: '$intelligence.reviewPriority',
            uncertainty: '$intelligence.uncertaintyLevel',
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Submission.findOne(matchFilter).sort({ createdAt: -1 }).select('createdAt').lean(),
  ]);

  const statusCounts = emptyStatusCounts();
  for (const row of statusRows) {
    if (SUBMISSION_PROCESSING_STATUSES.includes(row._id)) {
      statusCounts[row._id] = row.count;
    }
  }

  const completeCount = statusCounts.complete;
  const errorCount = statusCounts.error;
  const needsManualReviewCount = statusCounts.needs_manual_review;
  const inFlightCount = ACTIVE_SUBMISSION_PROCESSING_STATUSES.reduce(
    (sum, key) => sum + statusCounts[key],
    0
  );
  const totalSubmissions = SUBMISSION_PROCESSING_STATUSES.reduce(
    (sum, key) => sum + statusCounts[key],
    0
  );

  let reviewedCount = 0;
  let overriddenCount = 0;
  let unreviewedCompleteCount = 0;

  for (const row of reviewRows) {
    if (row._id === 'reviewed') {
      reviewedCount += row.count;
      continue;
    }
    if (row._id === 'overridden') {
      overriddenCount += row.count;
      reviewedCount += row.count;
      continue;
    }
    unreviewedCompleteCount += row.count;
  }

  if (reviewRows.length === 0) {
    unreviewedCompleteCount = completeCount;
  }

  let highPriorityReviewCount = 0;
  let highUncertaintyCount = 0;
  for (const row of intelligenceRows) {
    if (row._id.priority === 'high') {
      highPriorityReviewCount += row.count;
    }
    if (row._id.uncertainty === 'high') {
      highUncertaintyCount += row.count;
    }
  }

  return {
    assignmentId,
    totalSubmissions,
    statusCounts,
    inFlightCount,
    needsManualReviewCount,
    completeCount,
    errorCount,
    reviewedCount,
    overriddenCount,
    unreviewedCompleteCount,
    highPriorityReviewCount,
    highUncertaintyCount,
    readyForClustering: completeCount > 0 && inFlightCount === 0,
    latestSubmissionAt: latestSubmission?.createdAt
      ? new Date(latestSubmission.createdAt).toISOString()
      : null,
  };
}
