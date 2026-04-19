import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/lib/models/assignment';
import { Submission } from '@/lib/models/submission';
import { resolveStudentKey } from '@/lib/student-key';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { teacherTenantFilter } from '@/lib/teacher-scope';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: 'Invalid assignment id' }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: 'Õpetaja autentimine on vajalik.' }, { status: 401 });
  }

  const assignment = await Assignment.findOne({
    _id: id,
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  }).select('_id');
  if (!assignment) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const submissions = await Submission.find({ assignmentId: id, ...teacherTenantFilter(context) })
    .select(
      '_id studentName studentKey processingStatus processingError analysis analysisMeta intelligence dataQuality teacherReview extractedSteps.stepNumber extractedSteps.misconceptionCode extractedSteps.confidence'
    )
    .sort({ createdAt: -1 })
    .lean();

  const payload = submissions.map((submission) => ({
    _id: String(submission._id),
    studentName: submission.studentName,
    studentKey: resolveStudentKey(submission.studentName, submission.studentKey),
    processingStatus: submission.processingStatus,
    processingError: submission.processingError,
    analysis: submission.analysis
      ? {
          primaryMisconception: submission.analysis.primaryMisconception,
          severityScore: submission.analysis.severityScore,
          firstErrorStep: submission.analysis.firstErrorStep,
        }
      : null,
    analysisMeta: submission.analysisMeta
      ? {
          extractionSource: submission.analysisMeta.extractionSource,
          classificationSource: submission.analysisMeta.classificationSource,
          extractionIsComplete: submission.analysisMeta.extractionIsComplete,
          deterministicGateApplied: submission.analysisMeta.deterministicGateApplied,
          deterministicGateReason: submission.analysisMeta.deterministicGateReason,
          averageConfidence: submission.analysisMeta.averageConfidence,
          lowConfidenceStepCount: submission.analysisMeta.lowConfidenceStepCount,
          analyzedAt: submission.analysisMeta.analyzedAt,
          pipelineVersion: submission.analysisMeta.pipelineVersion,
        }
      : null,
    intelligence: submission.intelligence
      ? {
          firstWrongStep: submission.intelligence.firstWrongStep,
          recoveryStep: submission.intelligence.recoveryStep,
          finalAnswerReasoningDivergence: submission.intelligence.finalAnswerReasoningDivergence,
          dominantErrorDimension: submission.intelligence.dominantErrorDimension,
          uncertaintyLevel: submission.intelligence.uncertaintyLevel,
          uncertaintyReasons: submission.intelligence.uncertaintyReasons,
          reviewPriority: submission.intelligence.reviewPriority,
          reviewPriorityScore: submission.intelligence.reviewPriorityScore,
        }
      : null,
    dataQuality: submission.dataQuality
      ? {
          trustLevel: submission.dataQuality.trustLevel,
          signalQualityScore: submission.dataQuality.signalQualityScore,
        }
      : null,
    teacherReview: submission.teacherReview
      ? {
          status: submission.teacherReview.status,
          reviewedAt: submission.teacherReview.reviewedAt,
          note: submission.teacherReview.note,
          overrideMisconceptionCode: submission.teacherReview.overrideMisconceptionCode,
          originalMisconceptionCode: submission.teacherReview.originalMisconceptionCode,
        }
      : null,
  }));

  return Response.json(payload);
}
