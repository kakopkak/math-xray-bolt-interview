import { TeacherIntervention } from '@/lib/models/teacher-intervention';

type BuildInterventionImpactSummaryInput = {
  teacherId: string;
  organizationKey: string;
};

function toWeekBucket(value: Date) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export async function buildInterventionImpactSummary(
  input: BuildInterventionImpactSummaryInput
) {
  const interventions = await TeacherIntervention.find({
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
  })
    .sort({ assignedAt: -1 })
    .limit(500)
    .lean();

  const weekMap = new Map<string, { total: number; completed: number; improved: number }>();

  for (const row of interventions) {
    const bucketKey = toWeekBucket(row.assignedAt || row.createdAt);
    const bucket = weekMap.get(bucketKey) || { total: 0, completed: 0, improved: 0 };
    bucket.total += 1;
    if (row.status === 'completed') {
      bucket.completed += 1;
    }
    if (row.outcome?.trend === 'improved') {
      bucket.improved += 1;
    }
    weekMap.set(bucketKey, bucket);
  }

  return [...weekMap.entries()]
    .map(([weekStart, bucket]) => ({
      weekStart,
      totalInterventions: bucket.total,
      completionRate: bucket.total > 0 ? Number((bucket.completed / bucket.total).toFixed(4)) : 0,
      improvementRate: bucket.total > 0 ? Number((bucket.improved / bucket.total).toFixed(4)) : 0,
    }))
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart));
}