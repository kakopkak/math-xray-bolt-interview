import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { getAssignmentProgressSummary } from '@/lib/assignment-progress';
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

  const summary = await getAssignmentProgressSummary(id, context);

  return Response.json(summary);
}
