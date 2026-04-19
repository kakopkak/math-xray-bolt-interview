import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { buildTeacherSuperDashboard } from "@/lib/super-dashboard/engine";
import SuperDashboardClient from "./super-dashboard-client";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  await connectDB();
  const requestHeaders = await headers();
  const context = await resolveTeacherRequestContext({ headers: requestHeaders });
  if (!context) {
    redirect("/login");
  }

  const [assignments, dashboard] = await Promise.all([
    Assignment.find({
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
    })
      .sort({ createdAt: -1 })
      .lean(),
    buildTeacherSuperDashboard({
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
    }),
  ]);

  const safeAssignments = JSON.parse(JSON.stringify(assignments)) as Array<{
    _id: string;
    title: string;
    topic: "quadratic_equations" | "linear_equations" | "fractions";
    gradeLevel: number;
    classLabel?: string;
    description: string;
    submissionCount: number;
    status: "draft" | "active" | "analyzed";
  }>;

  if (safeAssignments.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">Ülesandeid veel ei ole.</p>
        <Link href="/teacher/new" className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline">
          Loo ülesanne
        </Link>
      </div>
    );
  }

  return <SuperDashboardClient initialDashboard={dashboard} initialAssignments={safeAssignments} />;
}
