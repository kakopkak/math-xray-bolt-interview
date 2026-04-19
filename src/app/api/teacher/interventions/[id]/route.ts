import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { TeacherIntervention } from '@/lib/models/teacher-intervention';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { z } from 'zod';

const UpdateInterventionSchema = z
  .object({
    status: z.enum(['planned', 'assigned', 'completed', 'cancelled']).optional(),
    note: z.string().trim().optional(),
    outcome: z
      .object({
        trend: z.enum(['improved', 'unchanged', 'worsened', 'unknown']),
        confidence: z.enum(['high', 'medium', 'low']),
        detail: z.string().trim().optional().default(''),
      })
      .optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Vigane sekkumise ID.' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = UpdateInterventionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Sekkumise uuendus on vigane.' }, { status: 400 });
  }

  const intervention = await TeacherIntervention.findOne({
    _id: id,
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  });
  if (!intervention) {
    return Response.json({ error: 'Sekkumist ei leitud.' }, { status: 404 });
  }

  const update = parsed.data;
  if (update.status) {
    intervention.status = update.status;
    if (update.status === 'completed' && !intervention.completedAt) {
      intervention.completedAt = new Date();
    }
  }
  if (typeof update.note === 'string') {
    intervention.note = update.note;
  }
  if (update.outcome) {
    intervention.outcome = {
      trend: update.outcome.trend,
      confidence: update.outcome.confidence,
      detail: update.outcome.detail || '',
    };
  }

  await intervention.save();

  return Response.json(intervention);
}
