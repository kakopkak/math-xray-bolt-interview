import AssignmentClient from "./assignment-client";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Cluster } from "@/lib/models/cluster";
import { getAssignmentProgressSummary } from "@/lib/assignment-progress";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { resolveRemediationError, resolveRemediationStatus } from "@/lib/remediation-status";
import { findTeacherAssignmentById } from "@/lib/teacher-scope";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherAssignmentPage({ params }: PageProps) {
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

  const [assignment, clusters, progress] = await Promise.all([
    findTeacherAssignmentById(id, context),
    Cluster.find({ assignmentId: id }).sort({ clusterSize: -1, createdAt: -1 }).lean(),
    getAssignmentProgressSummary(id, context),
  ]);

  if (!assignment) {
    notFound();
  }

  const clustersWithStatus = clusters.map((cluster) => ({
    ...cluster,
    remediationStatus: resolveRemediationStatus(cluster),
    remediationError: resolveRemediationError(cluster),
  }));

  return (
    <AssignmentClient
      assignmentId={id}
      demoSeedToken={process.env.DEMO_SEED_TOKEN ?? ""}
      initialAssignment={JSON.parse(JSON.stringify(assignment))}
      initialClusters={JSON.parse(JSON.stringify(clustersWithStatus))}
      initialProgress={progress}
    />
  );
}
