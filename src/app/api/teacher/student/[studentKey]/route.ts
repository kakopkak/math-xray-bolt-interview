import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildStudentProfile } from '@/lib/student-profile';

type RouteContext = {
  params: Promise<{ studentKey: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { studentKey } = await params;
  await connectDB();

  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const profile = await buildStudentProfile({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    studentKey,
  });

  return Response.json(profile);
}