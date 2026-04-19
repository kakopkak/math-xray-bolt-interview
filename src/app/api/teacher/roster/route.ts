import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { StudentRosterEntry } from '@/lib/models/student-roster';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { z } from 'zod';
import { toClassKey } from '@/lib/class-key';

const UpsertRosterSchema = z
  .object({
    classLabel: z.string().trim().min(1),
    rosterStudentId: z.string().trim().min(1),
    canonicalName: z.string().trim().min(1),
    aliases: z.array(z.string().trim()).optional().default([]),
    active: z.boolean().optional().default(true),
  })
  .strict();

export async function GET(request: NextRequest) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const classKey = request.nextUrl.searchParams.get('classKey');

  const rows = await StudentRosterEntry.find({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    ...(classKey ? { classKey } : {}),
  })
    .sort({ classKey: 1, canonicalName: 1 })
    .lean();

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = UpsertRosterSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Nimekirja kirje andmed on vigased.' }, { status: 400 });
  }

  const body = parsed.data;
  const classKey = toClassKey(body.classLabel) || 'default-class';

  const doc = await StudentRosterEntry.findOneAndUpdate(
    {
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
      classKey,
      rosterStudentId: body.rosterStudentId,
    },
    {
      $set: {
        canonicalName: body.canonicalName,
        aliases: body.aliases,
        active: body.active,
      },
      $setOnInsert: {
        teacherId: context.teacherId,
        organizationKey: context.organizationKey,
        classKey,
        rosterStudentId: body.rosterStudentId,
      },
    },
    { upsert: true, new: true }
  );

  return Response.json(doc, { status: 201 });
}
