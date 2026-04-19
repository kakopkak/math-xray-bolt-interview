import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";
import { Cluster } from "@/lib/models/cluster";
import { getAssignmentProgressSummary } from "@/lib/assignment-progress";
import DemoClient from "./demo-client";

export const dynamic = "force-dynamic";

const DEMO_SEED_MARKER = "wave2-2-1-demo-seed";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] | undefined }>;
};

export default async function DemoPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const providedToken = Array.isArray(resolvedSearchParams.token)
    ? resolvedSearchParams.token[0]
    : resolvedSearchParams.token;
  const expectedToken = process.env.DEMO_SEED_TOKEN;

  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    notFound();
  }

  await connectDB();

  const assignment = await Assignment.findOne({ seedMarker: DEMO_SEED_MARKER }).lean();
  if (!assignment) {
    return (
      <DemoClient
        demoToken={providedToken}
        initialAssignment={null}
        initialClusters={[]}
        initialProgress={null}
      />
    );
  }

  const [clusters, progress] = await Promise.all([
    Cluster.find({ assignmentId: assignment._id }).sort({ clusterSize: -1, createdAt: -1 }).lean(),
    getAssignmentProgressSummary(assignment._id.toString()),
  ]);

  return (
    <DemoClient
      demoToken={providedToken}
      initialAssignment={JSON.parse(JSON.stringify(assignment))}
      initialClusters={JSON.parse(JSON.stringify(clusters))}
      initialProgress={progress}
    />
  );
}
