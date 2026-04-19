import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/lib/models/submission';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { teacherTenantFilter } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LivePulseAvatar = {
  id: string;
  anonymousName: string;
  status: string;
};

function toAnonymousName(index: number) {
  return `Õpilane ${index + 1}`;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id: assignmentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return Response.json({ error: 'Vigane ülesande ID.' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const submissions = await Submission.find({
    assignmentId,
    ...teacherTenantFilter(context),
  })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  const avatars: LivePulseAvatar[] = submissions.map((row, index) => ({
    id: String(row._id),
    anonymousName: toAnonymousName(index),
    status: row.processingStatus,
  }));

  return Response.json({
    assignmentId,
    pulse: {
      total: submissions.length,
      activeCount: submissions.filter(
        (row) => row.processingStatus === 'pending' || row.processingStatus === 'extracting' || row.processingStatus === 'classifying'
      ).length,
      avatars,
    },
  });
}