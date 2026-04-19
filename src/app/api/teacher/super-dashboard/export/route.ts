import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildTeacherSuperDashboard } from '@/lib/super-dashboard/engine';

export const dynamic = 'force-dynamic';

function toCsvCell(value: string) {
  return `"${value.replace(/[\r\n]/g, ' ').replace(/"/g, '""')}"`;
}

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
    bypassCache: true,
  });

  const csvRows: string[] = [];
  csvRows.push([
    'student_key',
    'student_name',
    'risk_score',
    'trend',
    'top_misconception_code',
    'top_misconception_label',
    'class_label',
    'latest_submission_id',
  ].join(','));

  for (const row of payload.studentsAtRisk) {
    const values = [
      row.studentKey,
      row.studentName,
      String(row.riskScore),
      row.trend,
      row.topMisconceptionCode || '',
      row.topMisconceptionLabelEt || '',
      row.classLabel,
      row.latestSubmissionId || '',
    ].map((value) => toCsvCell(value));
    csvRows.push(values.join(','));
  }

  const fileName = `super-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${fileName}`,
    },
  });
}
