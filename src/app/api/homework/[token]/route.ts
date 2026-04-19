import { connectDB } from '@/lib/mongodb';
import { PersonalizedAssignment } from '@/lib/models/personalized-assignment';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  await connectDB();

  const homework = await PersonalizedAssignment.findOne({ shareToken: token }).lean();
  if (!homework) {
    return Response.json({ error: 'Kodutööd ei leitud.' }, { status: 404 });
  }

  return Response.json({
    id: String(homework._id),
    shareToken: homework.shareToken,
    assignmentId: homework.assignmentId,
    studentKey: homework.studentKey,
    title: homework.title,
    promptEt: homework.promptEt,
    status: homework.status,
    dueAt: homework.dueAt,
    topic: homework.topic,
  });
}