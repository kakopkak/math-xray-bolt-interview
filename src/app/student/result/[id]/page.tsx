import ResultClient from "./result-client";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { findTeacherClusterAccess, findTeacherSubmissionById } from "@/lib/teacher-scope";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentResultPage({ params }: PageProps) {
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

  const submission = await findTeacherSubmissionById(id, context);
  if (!submission) {
    notFound();
  }

  const clusterAccess = submission.clusterId
    ? await findTeacherClusterAccess(submission.clusterId, context)
    : null;
  const cluster = clusterAccess?.cluster ? JSON.parse(JSON.stringify(clusterAccess.cluster)) : null;

  return (
    <ResultClient
      submissionId={id}
      initialSubmission={JSON.parse(JSON.stringify(submission))}
      initialExercises={JSON.parse(JSON.stringify(cluster?.remediationExercises || []))}
    />
  );
}
