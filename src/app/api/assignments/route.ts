import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { resolveClassContext, normalizeOrganizationKey } from '@/lib/class-key';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import {
  CreateAssignmentRequestSchema,
  formatSchemaFieldErrors,
  isInvalidJsonBodyError,
  readJsonBody,
} from '@/lib/schemas';
import { createLogger, resolveRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const log = createLogger('api/assignments', { requestId });
  try {
    await connectDB();
    const context = await resolveTeacherRequestContext(request);
    if (!context) {
      return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
    }

    const assignments = await Assignment.find({
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
    })
      .sort({ createdAt: -1 })
      .lean();
    return Response.json(assignments, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    log.error('assignments_load_failed', undefined, error);
    return Response.json({ error: 'Failed to load assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const log = createLogger('api/assignments', { requestId });
  try {
    const body = await readJsonBody(request);
    const parsed = CreateAssignmentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: 'Ülesande andmed on vigased.',
          fieldErrors: formatSchemaFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const {
      title,
      topic,
      gradeLevel,
      classLabel,
      description,
      answerKey,
      curriculumOutcomes,
    } = parsed.data;

    await connectDB();

    const requestContext = await resolveTeacherRequestContext(request);
    if (!requestContext) {
      return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
    }
    const classContext = resolveClassContext({ gradeLevel, classLabel });

    const assignment = await Assignment.create({
      title,
      topic,
      gradeLevel,
      classLabel: classContext.classLabel,
      classKey: classContext.classKey,
      organizationKey: normalizeOrganizationKey(requestContext.organizationKey),
      teacherId: requestContext.teacherId,
      description,
      answerKey,
      curriculumOutcomes,
      status: 'active',
      submissionCount: 0,
      taxonomyVersion: '2026-04-topic-v1',
    });

    log.info('assignment_created', { assignmentId: assignment._id.toString() });
    return Response.json(assignment, { status: 201, headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    if (isInvalidJsonBodyError(error)) {
      return Response.json({ error: 'Vigane JSON-keha.' }, { status: 400 });
    }

    log.error('assignment_create_failed', undefined, error);
    return Response.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
