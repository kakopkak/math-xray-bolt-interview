import mongoose from 'mongoose';
import { after } from 'next/server';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { Submission } from '@/lib/models/submission';
import { Cluster } from '@/lib/models/cluster';
import { clusterByMisconception } from '@/lib/ai/cluster-submissions';
import { generateRemediation } from '@/lib/ai/generate-remediation';
import { ACTIVE_SUBMISSION_PROCESSING_STATUSES } from '@/lib/submission-status';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { createLogger, resolveRequestId } from '@/lib/logger';
import { teacherTenantFilter } from '@/lib/teacher-scope';

const CLUSTER_LOCK_FRESH_MS = 30_000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger('api/assignments/cluster', { requestId, assignmentId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid assignment id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const assignment = await Assignment.findOne({
    _id: id,
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  });
  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const hasFreshLock =
    assignment.clusteringLockAt &&
    Date.now() - new Date(assignment.clusteringLockAt).getTime() < CLUSTER_LOCK_FRESH_MS;
  if (hasFreshLock) {
    return Response.json(
      { error: 'Klasterdamine on juba käimas. Proovi hetk hiljem uuesti.' },
      { status: 409 }
    );
  }

  assignment.clusteringLockAt = new Date();
  await assignment.save();

  try {
    const inFlightCount = await Submission.countDocuments({
      assignmentId: id,
      ...teacherTenantFilter(context),
      processingStatus: { $in: ACTIVE_SUBMISSION_PROCESSING_STATUSES },
    });
    if (inFlightCount > 0) {
      return Response.json(
        { error: `Klasterdamist ei saa käivitada: ${inFlightCount} esitust on veel töötlemisel.` },
        { status: 409 }
      );
    }

    const submissions = await Submission.find({
      assignmentId: id,
      ...teacherTenantFilter(context),
      analysis: { $ne: null },
      processingStatus: 'complete',
    });

    if (submissions.length === 0) {
      return Response.json(
        { error: 'No analyzed submissions available for clustering' },
        { status: 400 }
      );
    }

    if (
      assignment.lastClusteredCompleteCount &&
      assignment.lastClusteredCompleteCount === submissions.length &&
      assignment.lastClusteredAt
    ) {
      const existingClusters = await Cluster.find({ assignmentId: id }).lean();
      if (existingClusters.length > 0) {
        return Response.json({
          clusters: existingClusters,
          clusterCount: existingClusters.length,
          reused: true,
        });
      }
    }

    const clusterPayloads = clusterByMisconception(submissions);

    await Cluster.deleteMany({ assignmentId: id });
    const clusters = await Cluster.insertMany(clusterPayloads);

    const misconceptionToClusterId = new Map(
      clusters.map((cluster) => [cluster.misconceptionCode, cluster._id.toString()])
    );

    const submissionUpdates = submissions
      .map((submission) => {
        const misconceptionCode = submission.analysis?.primaryMisconception || 'QE_NO_ERROR';
        const clusterId = misconceptionToClusterId.get(misconceptionCode);
        if (!clusterId) return null;

        return {
          updateOne: {
            filter: { _id: submission._id },
            update: { $set: { clusterId } },
          },
        };
      })
      .filter(Boolean);

    if (submissionUpdates.length > 0) {
      await Submission.bulkWrite(
        submissionUpdates as {
          updateOne: { filter: { _id: mongoose.Types.ObjectId }; update: { $set: { clusterId: string } } };
        }[]
      );
    }

    assignment.status = 'analyzed';
    assignment.lastClusteredAt = new Date();
    assignment.lastClusteredCompleteCount = submissions.length;
    await assignment.save();

    const gradeLevel = assignment.gradeLevel ?? 9;
    const remediationTargets = clusters.filter((cluster) => cluster.misconceptionCode !== 'QE_NO_ERROR');
    if (remediationTargets.length > 0) {
      after(() => {
        void Promise.all(
          remediationTargets.map(async (cluster) => {
            try {
              const exercises = await generateRemediation(cluster.misconceptionCode, gradeLevel);
              await Cluster.findByIdAndUpdate(cluster._id, {
                remediationExercises: exercises,
                remediationStatus: 'ready',
                remediationError: '',
              });
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error);
              await Cluster.findByIdAndUpdate(cluster._id, {
                remediationStatus: 'failed',
                remediationError: message,
              });
            }
          })
        ).catch((error: unknown) => {
          log.error('auto_remediation_failed', undefined, error);
        });
      });
    }

    return Response.json({ clusters, clusterCount: clusters.length });
  } finally {
    await Assignment.updateOne(
      { _id: id, ...teacherTenantFilter(context) },
      { $set: { clusteringLockAt: null } }
    );
  }
}
