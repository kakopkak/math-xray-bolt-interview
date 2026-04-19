import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/lib/models/submission';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { ReviewOverrideSchema } from '@/lib/schemas';
import { teacherTenantFilter } from '@/lib/teacher-scope';

const BulkReviewSchema = z
  .object({
    submissionIds: z.array(z.string().trim().min(1)).min(1),
    override: ReviewOverrideSchema,
  })
  .strict();

export async function POST(request: Request) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = BulkReviewSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'BulkReview andmed on vigased.' }, { status: 400 });
  }

  const { submissionIds, override } = parsed.data;
  const objectIds = submissionIds.filter((value) => mongoose.Types.ObjectId.isValid(value));
  if (objectIds.length === 0) {
    return Response.json({ error: 'Ühtegi kehtivat submissionIds väärtust ei leitud.' }, { status: 400 });
  }

  const reviewStatus = override.overrideMisconceptionCode ? 'overridden' : 'reviewed';
  const reviewedAt = new Date();

  const result = await Submission.updateMany(
    {
      _id: { $in: objectIds },
      ...teacherTenantFilter(context),
    },
    [
      {
        $set: {
          teacherReview: {
            status: reviewStatus,
            reviewedAt,
            note: override.note,
            overrideMisconceptionCode: override.overrideMisconceptionCode ?? null,
            originalMisconceptionCode: {
              $ifNull: [
                '$teacherReview.originalMisconceptionCode',
                '$analysis.primaryMisconception',
                'QE_NO_ERROR',
              ],
            },
          },
        },
      },
    ]
  );

  return Response.json({
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
}
