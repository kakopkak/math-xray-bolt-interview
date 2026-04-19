import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/lib/models/submission';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { resolveRemediationError, resolveRemediationStatus } from '@/lib/remediation-status';
import { resolveStudentKey } from '@/lib/student-key';
import { findTeacherClusterAccess, teacherTenantFilter } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid cluster id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const access = await findTeacherClusterAccess(id, context);
  if (!access) {
    return Response.json({ error: 'Cluster not found' }, { status: 404 });
  }
  const cluster = access.cluster.toObject ? access.cluster.toObject() : access.cluster;

  const rawSubmissionIds: unknown[] = Array.isArray(cluster.studentSubmissionIds)
    ? (cluster.studentSubmissionIds as unknown[])
    : [];
  const submissionIds = rawSubmissionIds.filter(
    (submissionId: unknown): submissionId is string =>
      typeof submissionId === 'string' && submissionId.length > 0
  );
  const validSubmissionIds = submissionIds.filter((submissionId: string) =>
    mongoose.Types.ObjectId.isValid(submissionId)
  );
  const submissions = validSubmissionIds.length
    ? await Submission.find({
        _id: { $in: validSubmissionIds },
        ...teacherTenantFilter(context),
      })
        .select(
          '_id assignmentId studentName studentKey classKey topic processingStatus extractedSteps analysis analysisMeta intelligence dataQuality teacherReview teacherReviewHistory processingError createdAt'
        )
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const clusterWithStatus = {
    ...cluster,
    remediationStatus: resolveRemediationStatus(cluster),
    remediationError: resolveRemediationError(cluster),
  };

  const submissionPayload = submissions.map((submission) => ({
    assignmentId: String(submission.assignmentId),
    _id: String(submission._id),
    studentName: submission.studentName,
    studentKey: resolveStudentKey(submission.studentName, submission.studentKey),
    classKey: submission.classKey,
    topic: submission.topic,
    processingStatus: submission.processingStatus,
    processingError: submission.processingError,
    extractedSteps: submission.extractedSteps || [],
    analysis: submission.analysis
      ? {
          primaryMisconception: submission.analysis.primaryMisconception,
          firstErrorStep: submission.analysis.firstErrorStep,
          severityScore: submission.analysis.severityScore,
          reasoningType: submission.analysis.reasoningType,
        }
      : null,
    analysisMeta: submission.analysisMeta || null,
    intelligence: submission.intelligence || null,
    dataQuality: submission.dataQuality || null,
    teacherReview: submission.teacherReview || null,
    teacherReviewHistory: submission.teacherReviewHistory || [],
    createdAt: submission.createdAt,
  }));

  return Response.json({ cluster: clusterWithStatus, submissions: submissionPayload });
}
