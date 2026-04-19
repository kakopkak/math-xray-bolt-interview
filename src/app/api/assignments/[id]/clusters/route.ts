import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { Cluster } from '@/lib/models/cluster';
import { resolveRemediationError, resolveRemediationStatus } from '@/lib/remediation-status';
import { resolveTeacherRequestContext } from '@/lib/request-context';

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
  }).select('_id');
  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const clusters = await Cluster.find({ assignmentId: id })
    .sort({ clusterSize: -1, createdAt: -1 })
    .lean();

  const clustersWithStatus = clusters.map((cluster) => ({
    ...cluster,
    remediationStatus: resolveRemediationStatus(cluster),
    remediationError: resolveRemediationError(cluster),
  }));

  return Response.json(clustersWithStatus);
}
