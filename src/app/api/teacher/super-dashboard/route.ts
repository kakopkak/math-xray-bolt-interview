import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildTeacherSuperDashboard } from '@/lib/super-dashboard/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await connectDB();

  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const payload = await buildTeacherSuperDashboard({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    classKey: searchParams.get('classKey'),
    assignmentId: searchParams.get('assignmentId'),
    topic: searchParams.get('topic'),
    studentKey: searchParams.get('studentKey'),
    misconceptionCode: searchParams.get('misconceptionCode'),
    severity: searchParams.get('severity'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    bypassCache: searchParams.get('bypassCache') === '1',
  });

  return Response.json(payload);
}
