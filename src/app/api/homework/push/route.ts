import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { createHomeworkShareToken } from '@/lib/homework-token';
import {
  buildHomeworkAssignmentsForCluster,
  selectTemplateForSeverity,
  type HomeworkSeverity,
  type HomeworkTemplate,
} from '@/lib/homework/engine';
import { PersonalizedAssignment } from '@/lib/models/personalized-assignment';
import { AssignmentTemplate } from '@/lib/models/assignment-template';
import { resolveTeacherRequestContext } from '@/lib/request-context';

const HomeworkPushSchema = z
  .object({
    assignmentId: z.string().trim().min(1),
    topic: z.enum(['quadratic_equations', 'linear_equations', 'fractions']),
    studentKeys: z.array(z.string().trim().min(1)).min(1),
    classKey: z.string().trim().min(1),
    clusterId: z.string().trim().min(1),
    severity: z.enum(['minor', 'major', 'fundamental']).optional().default('major'),
    title: z.string().trim().min(1),
    promptEt: z.string().trim().min(1),
    answerKey: z.string().trim().min(1),
    dueAt: z.string().trim().optional().default(''),
  })
  .strict();

export async function POST(request: Request) {
  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = HomeworkPushSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Kodutöö andmed on vigased.' }, { status: 400 });
  }

  const body = parsed.data;
  const templateRows = await AssignmentTemplate.find({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    classKey: body.classKey,
    misconceptionCode: body.clusterId,
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  const templates: HomeworkTemplate[] = templateRows.map((row) => ({
    severity: row.severity as HomeworkSeverity,
    title: row.title,
    promptEt: row.promptEt,
    answerKey: row.answerKey,
  }));
  const selectedTemplate = selectTemplateForSeverity(templates, body.severity as HomeworkSeverity);
  const template = selectedTemplate || {
    severity: body.severity as HomeworkSeverity,
    title: body.title,
    promptEt: body.promptEt,
    answerKey: body.answerKey,
  };
  const assignments = buildHomeworkAssignmentsForCluster(
    {
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
      classKey: body.classKey,
      assignmentId: body.assignmentId,
      clusterId: body.clusterId,
      studentKeys: body.studentKeys,
      template,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      topic: body.topic,
    },
    createHomeworkShareToken
  );
  const insertedRows = assignments.length > 0 ? await PersonalizedAssignment.insertMany(assignments) : [];

  return Response.json(
    {
      count: insertedRows.length,
      assignments: insertedRows.map((homework) => ({
        id: String(homework._id),
        studentKey: homework.studentKey,
        clusterId: homework.clusterId,
        shareToken: homework.shareToken,
        solveLink: `/solve/${homework.shareToken}`,
        status: homework.status,
        assignmentId: homework.assignmentId,
        topic: homework.topic,
      })),
    },
    { status: 201 }
  );
}