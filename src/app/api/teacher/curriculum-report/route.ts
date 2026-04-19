import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildCurriculumMastery } from '@/lib/curriculum-mastery';

export async function GET(request: Request) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const curriculum = await buildCurriculumMastery({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  });

  return Response.json({ curriculum });
}