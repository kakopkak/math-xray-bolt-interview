import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { ParentBrief } from '@/lib/models/parent-brief';
import { Submission } from '@/lib/models/submission';
import { buildParentBriefPrompt } from '@/lib/parent-brief-prompt';
import { resolveTeacherRequestContext } from '@/lib/request-context';

const ParentBriefRequestSchema = z
  .object({
    studentKey: z.string().trim().min(1),
  })
  .strict();

export async function POST(request: Request) {
  await connectDB();

  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = ParentBriefRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Lapsevanema kirja andmed on vigased.' }, { status: 400 });
  }

  const { studentKey } = parsed.data;
  const recentSubmissions = await Submission.find({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    studentKey,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const studentName = recentSubmissions[0]?.studentName || studentKey;
  const misconceptionCodes = recentSubmissions
    .map((row) => row.analysis?.primaryMisconception || 'QE_NO_ERROR')
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 3);

  const bodyEt = buildParentBriefPrompt({
    studentName,
    misconceptionCodes,
  });

  const brief = await ParentBrief.create({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    studentKey,
    studentName,
    bodyEt,
    sourceSubmissionIds: recentSubmissions.map((row) => String(row._id)),
    generatedAt: new Date(),
  });

  return Response.json({
    id: String(brief._id),
    studentKey: brief.studentKey,
    studentName: brief.studentName,
    bodyEt: brief.bodyEt,
    generatedAt: brief.generatedAt,
  });
}