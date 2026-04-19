import mongoose from "mongoose";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";
import { connectDB } from "@/lib/mongodb";
import { Cluster } from "@/lib/models/cluster";
import { Submission } from "@/lib/models/submission";
import { buildAssignmentAnalytics } from "@/lib/assignment-analytics";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { findTeacherAssignmentById, teacherTenantFilter } from "@/lib/teacher-scope";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherAssignmentAnalyticsPage({ params }: PageProps) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectDB();
  const requestHeaders = await headers();
  const context = await resolveTeacherRequestContext({ headers: requestHeaders });
  if (!context) {
    redirect("/login");
  }

  const [assignment, clusters] = await Promise.all([
    findTeacherAssignmentById(id, context, "title parentAssignmentId"),
    Cluster.find({ assignmentId: id }).select("_id misconceptionCode").lean(),
  ]);
  if (!assignment) {
    notFound();
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

  const initialAnalytics = buildAssignmentAnalytics(submissions, {
    parentSubmissions,
  });
  const clusterHrefByCode = Object.fromEntries(
    clusters.map((cluster) => [cluster.misconceptionCode, `/teacher/cluster/${cluster._id.toString()}`] as const)
  );

  return (
    <AnalyticsClient
      assignmentId={id}
      assignmentTitle={assignment.title}
      clusterHrefByCode={clusterHrefByCode}
      initialAnalytics={initialAnalytics}
    />
  );
}
