import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildInterventionImpactSummary } from '@/lib/intervention-impact';

export async function GET(request: Request) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const interventionImpact = await buildInterventionImpactSummary({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  });

  return Response.json({ interventionImpact });
}