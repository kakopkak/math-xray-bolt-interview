import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";
import { Submission } from "@/lib/models/submission";
import {
  PIPELINE_TIMEOUT_REASON,
  PIPELINE_TIMEOUT_STALE_MS,
} from "@/lib/pipeline-timeout";
import { ACTIVE_SUBMISSION_PROCESSING_STATUSES } from "@/lib/submission-status";

export type AdminSweepReport = {
  staleBeforeIso: string;
  submissionsQuarantined: number;
  clusteringLocksCleared: number;
  nextMoveLocksCleared: number;
  dryRun: boolean;
};

const LOCK_STALE_MS = 60_000; // 2× the per-route freshness window — defensive

export async function runAdminSweep(options: { dryRun?: boolean } = {}): Promise<AdminSweepReport> {
  const dryRun = Boolean(options.dryRun);
  await connectDB();

  const now = Date.now();
  const submissionStaleBefore = new Date(now - PIPELINE_TIMEOUT_STALE_MS);
  const lockStaleBefore = new Date(now - LOCK_STALE_MS);

  const stuckSubmissionsFilter = {
    processingStatus: { $in: ACTIVE_SUBMISSION_PROCESSING_STATUSES as unknown as string[] },
    updatedAt: { $lt: submissionStaleBefore },
  };

  const submissionsQuarantined = await Submission.countDocuments(stuckSubmissionsFilter);

  const clusteringLockFilter = {
    clusteringLockAt: { $ne: null, $lt: lockStaleBefore },
  };
  const clusteringLocksCleared = await Assignment.countDocuments(clusteringLockFilter);

  const nextMoveLockFilter = {
    "nextMove.generationLockAt": { $ne: null, $lt: lockStaleBefore },
  };
  const nextMoveLocksCleared = await Assignment.countDocuments(nextMoveLockFilter);

  if (!dryRun) {
    if (submissionsQuarantined > 0) {
      await Submission.updateMany(stuckSubmissionsFilter, {
        $set: {
          extractedSteps: [],
          analysis: null,
          analysisMeta: null,
          intelligence: null,
          teacherReview: null,
          teacherReviewHistory: [],
          clusterId: null,
          processingStatus: "needs_manual_review",
          processingError: PIPELINE_TIMEOUT_REASON,
        },
      });
    }

    if (clusteringLocksCleared > 0) {
      await Assignment.updateMany(clusteringLockFilter, {
        $set: { clusteringLockAt: null },
      });
    }

    if (nextMoveLocksCleared > 0) {
      await Assignment.updateMany(nextMoveLockFilter, {
        $set: { "nextMove.generationLockAt": null },
      });
    }
  }

  return {
    staleBeforeIso: submissionStaleBefore.toISOString(),
    submissionsQuarantined,
    clusteringLocksCleared,
    nextMoveLocksCleared,
    dryRun,
  };
}
