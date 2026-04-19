import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { TeacherIntervention } from '@/lib/models/teacher-intervention';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { z } from 'zod';

const CreateInterventionSchema = z
  .object({
    assignmentId: z.string().trim().optional().default(''),
    submissionId: z.string().trim().optional().default(''),
    studentKey: z.string().trim().min(1),
    classKey: z.string().trim().min(1),
    topic: z.enum(['quadratic_equations', 'linear_equations', 'fractions']),
    misconceptionCode: z.string().trim().min(1),
    interventionType: z.enum([
      'review_note',
      'assignment_spawn',
      'manual_exercise',
      'conference',
      'group_reteach',
    ]),
    status: z.enum(['planned', 'assigned', 'completed', 'cancelled']).optional().default('planned'),
    title: z.string().trim().min(1),
    note: z.string().trim().optional().default(''),
    dueAt: z.string().trim().optional().default(''),
  })
  .strict();

export async function GET(request: NextRequest) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const classKey = request.nextUrl.searchParams.get('classKey');
  const studentKey = request.nextUrl.searchParams.get('studentKey');

  const rows = await TeacherIntervention.find({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    ...(classKey ? { classKey } : {}),
    ...(studentKey ? { studentKey } : {}),
  })
    .sort({ assignedAt: -1 })
    .limit(200)
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
  const parsed = CreateInterventionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Sekkumise andmed on vigased.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const intervention = await TeacherIntervention.create({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    classKey: body.classKey,
    assignmentId:
      body.assignmentId && mongoose.Types.ObjectId.isValid(body.assignmentId)
        ? new mongoose.Types.ObjectId(body.assignmentId)
        : null,
    submissionId:
      body.submissionId && mongoose.Types.ObjectId.isValid(body.submissionId)
        ? new mongoose.Types.ObjectId(body.submissionId)
        : null,
    studentKey: body.studentKey,
    topic: body.topic,
    misconceptionCode: body.misconceptionCode,
    interventionType: body.interventionType,
    status: body.status,
    title: body.title,
    note: body.note,
    assignedAt: new Date(),
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    completedAt: null,
    evidenceSubmissionIds: body.submissionId ? [body.submissionId] : [],
  });

  return Response.json(intervention, { status: 201 });
}
