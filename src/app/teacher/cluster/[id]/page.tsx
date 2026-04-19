import ClusterClient from "./cluster-client";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Submission } from "@/lib/models/submission";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { resolveRemediationError, resolveRemediationStatus } from "@/lib/remediation-status";
import { findTeacherClusterAccess, teacherTenantFilter } from "@/lib/teacher-scope";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClusterPage({ params }: PageProps) {
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

  const access = await findTeacherClusterAccess(id, context);
  if (!access) {
    notFound();
  }

  const cluster = access.cluster.toObject ? access.cluster.toObject() : access.cluster;
  const submissions = cluster.studentSubmissionIds?.length
    ? await Submission.find({
        _id: { $in: cluster.studentSubmissionIds },
        ...teacherTenantFilter(context),
      })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const clusterWithStatus = {
    ...cluster,
    remediationStatus: resolveRemediationStatus(cluster),
    remediationError: resolveRemediationError(cluster),
  };

  const payload = {
    cluster: JSON.parse(JSON.stringify(clusterWithStatus)),
    submissions: JSON.parse(JSON.stringify(submissions)),
  };

  return <ClusterClient clusterId={id} initialPayload={payload} />;
}
