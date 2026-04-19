import { Submission } from '@/lib/models/submission';

type BuildCurriculumMasteryInput = {
  teacherId: string;
  organizationKey: string;
};

export async function buildCurriculumMastery(input: BuildCurriculumMasteryInput) {
  const submissions = await Submission.find({
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
    processingStatus: 'complete',
  })
    .select('topic analysis')
    .lean();

  const topicMap = new Map<
    string,
    { total: number; correct: number; misconceptionCounts: Map<string, number> }
  >();

  for (const row of submissions) {
    const topicKey = row.topic || 'unknown';
    const bucket = topicMap.get(topicKey) || {
      total: 0,
      correct: 0,
      misconceptionCounts: new Map<string, number>(),
    };
    bucket.total += 1;
    if (row.analysis?.overallCorrect) {
      bucket.correct += 1;
    }
    const misconception = row.analysis?.primaryMisconception || 'QE_NO_ERROR';
    bucket.misconceptionCounts.set(
      misconception,
      (bucket.misconceptionCounts.get(misconception) || 0) + 1
    );
    topicMap.set(topicKey, bucket);
  }

  return [...topicMap.entries()]
    .map(([topic, bucket]) => ({
      topic,
      totalSubmissions: bucket.total,
      masteryRate: bucket.total > 0 ? Number((bucket.correct / bucket.total).toFixed(4)) : 0,
      topMisconceptions: [...bucket.misconceptionCounts.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
        .slice(0, 5),
    }))
    .sort((left, right) => left.topic.localeCompare(right.topic));
}