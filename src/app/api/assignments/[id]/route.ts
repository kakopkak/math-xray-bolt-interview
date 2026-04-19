import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { Submission } from '@/lib/models/submission';
import { Cluster } from '@/lib/models/cluster';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { teacherTenantFilter } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
  }).lean();
  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const [submissionCount, clusterCount] = await Promise.all([
    Submission.countDocuments({ assignmentId: id, ...teacherTenantFilter(context) }),
    Cluster.countDocuments({ assignmentId: id }),
  ]);

  return Response.json({
    _id: assignment._id,
    title: assignment.title,
    topic: assignment.topic,
    gradeLevel: assignment.gradeLevel,
    classLabel: assignment.classLabel,
    classKey: assignment.classKey,
    organizationKey: assignment.organizationKey,
    teacherId: assignment.teacherId,
    taxonomyVersion: assignment.taxonomyVersion,
    description: assignment.description,
    answerKey: assignment.answerKey,
    curriculumOutcomes: assignment.curriculumOutcomes,
    seedMarker: assignment.seedMarker ?? null,
    lastClusteredAt: assignment.lastClusteredAt ?? null,
    lastClusteredCompleteCount: assignment.lastClusteredCompleteCount ?? 0,
    status: assignment.status,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    submissionCount,
    clusterCount,
  });
}
