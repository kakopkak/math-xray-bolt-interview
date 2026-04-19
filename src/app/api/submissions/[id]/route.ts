import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { resolveStudentKey } from '@/lib/student-key';
import { findTeacherSubmissionById } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid submission id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const submission = await findTeacherSubmissionById(
    id,
    context,
    '_id studentName studentKey processingStatus processingError extractedSteps analysis analysisMeta intelligence teacherReview teacherReviewHistory clusterId createdAt updatedAt'
  );
  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  return Response.json({
    _id: String(submission._id),
    studentName: submission.studentName,
    studentKey: resolveStudentKey(submission.studentName, submission.studentKey),
    processingStatus: submission.processingStatus,
    processingError: submission.processingError,
    extractedSteps: submission.extractedSteps || [],
    analysis: submission.analysis,
    analysisMeta: submission.analysisMeta || null,
    intelligence: submission.intelligence || null,
    teacherReview: submission.teacherReview || null,
    teacherReviewHistory: submission.teacherReviewHistory || [],
    clusterId: submission.clusterId || null,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  });
}
