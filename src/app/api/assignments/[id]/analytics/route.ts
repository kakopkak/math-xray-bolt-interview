import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";
import { Submission } from "@/lib/models/submission";
import { buildAssignmentAnalytics } from "@/lib/assignment-analytics";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { teacherTenantFilter } from "@/lib/teacher-scope";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: "Õpetaja autentimine on vajalik." }, { status: 401 });
  }

  const assignment = await Assignment.findOne({
    _id: id,
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  }).select("_id parentAssignmentId");
  if (!assignment) {
    return Response.json({ error: "Assignment not found" }, { status: 404 });
  }

  const submissions = await Submission.find({ assignmentId: id, ...teacherTenantFilter(context) })
    .select("_id assignmentId studentName studentKey createdAt processingStatus analysis analysisMeta dataQuality teacherReview")
    .sort({ createdAt: -1 })
    .lean();

  const parentSubmissions = assignment.parentAssignmentId
    ? await Submission.find({
        assignmentId: assignment.parentAssignmentId,
        ...teacherTenantFilter(context),
      })
        .select(
          "_id assignmentId studentName studentKey createdAt processingStatus analysis analysisMeta dataQuality teacherReview"
        )
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const analytics = buildAssignmentAnalytics(submissions, {
    parentSubmissions,
  });
  return Response.json(analytics);
}
