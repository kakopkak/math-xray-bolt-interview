import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { TopicNotebook } from '@/lib/models/topic-notebook';
import { resolveTeacherRequestContext } from '@/lib/request-context';

const NotebookWriteSchema = z
  .object({
    note: z.string().trim().min(1),
  })
  .strict();

type RouteContext = {
  params: Promise<{ topic: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { topic } = await params;
  await connectDB();

  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const notebook = await TopicNotebook.findOne({
    organizationKey: context.organizationKey,
    topic,
  }).lean();

  return Response.json({
    topic,
    organizationKey: context.organizationKey,
    entries: notebook?.entries || [],
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { topic } = await params;
  await connectDB();

  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = NotebookWriteSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Märkmiku kirje andmed on vigased.' }, { status: 400 });
  }

  const updated = await TopicNotebook.findOneAndUpdate(
    {
      organizationKey: context.organizationKey,
      topic,
    },
    {
      $push: { entries: { at: new Date(), note: parsed.data.note } },
      $setOnInsert: {
        organizationKey: context.organizationKey,
        topic,
      },
    },
    { new: true, upsert: true }
  ).lean();

  return Response.json({
    topic,
    organizationKey: context.organizationKey,
    entries: updated?.entries || [],
  });
}