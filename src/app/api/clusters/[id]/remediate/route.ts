import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { generateRemediation } from '@/lib/ai/generate-remediation';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { findTeacherClusterAccess } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
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
  const { cluster, assignment } = access;

  const gradeLevel = assignment?.gradeLevel ?? 9;

  cluster.remediationStatus = 'pending';
  cluster.remediationError = '';
  await cluster.save();

  try {
    const remediationExercises = await generateRemediation(cluster.misconceptionCode, gradeLevel);
    cluster.remediationExercises = remediationExercises;
    cluster.remediationStatus = 'ready';
    cluster.remediationError = '';
    await cluster.save();

    return Response.json({
      clusterId: cluster._id,
      misconceptionCode: cluster.misconceptionCode,
      remediationStatus: cluster.remediationStatus,
      remediationError: cluster.remediationError,
      remediationExercises,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    cluster.remediationStatus = 'failed';
    cluster.remediationError = message;
    await cluster.save();

    return Response.json(
      {
        error: 'Remediation generation failed',
        clusterId: cluster._id,
        remediationStatus: cluster.remediationStatus,
        remediationError: cluster.remediationError,
      },
      { status: 502 }
    );
  }
}
