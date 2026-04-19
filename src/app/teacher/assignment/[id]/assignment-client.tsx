"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { DemoSeedCta } from "@/components/demo-seed-cta";
import DemoWalkthrough from "@/components/demo-walkthrough";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { StatCard } from "@/components/ui/stat-card";
import { TrustTag } from "@/components/ui/trust-tag";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import {
  formatPriority,
  type TeacherTone,
} from "@/lib/teacher-copy";
import { formatRelativeTimeEt } from "@/lib/relative-time";
import {
  getManualReviewMessage,
  PIPELINE_TIMEOUT_OBSERVE_MS,
} from "@/lib/pipeline-timeout";
import {
  isActiveSubmissionProcessingStatus,
  type SubmissionProcessingStatus,
} from "@/lib/submission-status";

type Assignment = {
  _id: string;
  title: string;
  gradeLevel: number;
  description: string;
  seedMarker?: string | null;
  submissionCount: number;
  clusterCount?: number;
};

type Cluster = {
  _id: string;
  label: string;
  labelEt?: string;
  misconceptionCode: string;
  clusterSize: number;
  severity: "none" | "minor" | "major" | "fundamental";
  remediationStatus?: "pending" | "ready" | "failed";
};

type ProgressSummary = {
  assignmentId: string;
  totalSubmissions: number;
  statusCounts: Record<SubmissionProcessingStatus, number>;
  inFlightCount: number;
  needsManualReviewCount: number;
  completeCount: number;
  errorCount: number;
  reviewedCount: number;
  overriddenCount: number;
  unreviewedCompleteCount: number;
  highPriorityReviewCount: number;
  highUncertaintyCount: number;
  readyForClustering: boolean;
  latestSubmissionAt: string | null;
};

type SubmissionIntelligence = {
  firstWrongStep: number | null;
  recoveryStep: number | null;
  finalAnswerReasoningDivergence: boolean;
  dominantErrorDimension: "procedural" | "conceptual" | "mixed";
  uncertaintyLevel: "low" | "medium" | "high";
  uncertaintyReasons: string[];
  reviewPriority: "low" | "medium" | "high";
  reviewPriorityScore: number;
};

type Submission = {
  _id: string;
  studentName: string;
  studentKey: string;
  processingStatus: SubmissionProcessingStatus;
  processingError: string;
  analysis: {
    primaryMisconception?: string;
    severityScore?: number;
  } | null;
  analysisMeta: {
    extractionSource: "ai" | "heuristic";
    classificationSource: "ai" | "heuristic" | "not_run";
    extractionIsComplete: boolean;
    deterministicGateApplied: boolean;
    deterministicGateReason?: string;
    averageConfidence: number;
  } | null;
  intelligence: SubmissionIntelligence | null;
  dataQuality: {
    trustLevel: "high" | "medium" | "low";
    signalQualityScore: number;
  } | null;
  teacherReview: {
    status: "unreviewed" | "reviewed" | "overridden";
  } | null;
};

type SubmissionsState =
  | { status: "loading"; data: Submission[] }
  | { status: "ready"; data: Submission[] }
  | { status: "error"; data: Submission[]; message: string };

type Props = {
  assignmentId: string;
  demoSeedToken: string;
  initialAssignment: Assignment | null;
  initialClusters: Cluster[];
  initialProgress: ProgressSummary;
};

const severityColor: Record<Cluster["severity"], string> = {
  none: "#14b8a6",
  minor: "#f59e0b",
  major: "#f97316",
  fundamental: "#f43f5e",
};

const severityLabelEt: Record<Cluster["severity"], string> = {
  none: "puudub",
  minor: "kerge",
  major: "suur",
  fundamental: "fundamentaalne",
};

const remediationStatusLabel: Record<"pending" | "ready" | "failed", string> = {
  pending: "töös",
  ready: "valmis",
  failed: "viga",
};

const statusLabelEt: Record<SubmissionProcessingStatus, string> = {
  pending: "Järjekorras",
  extracting: "Sammud",
  classifying: "Tuvastus",
  needs_manual_review: "Vajab ülevaatust",
  complete: "Valmis",
  error: "Viga",
};

const statusVariant: Record<
  SubmissionProcessingStatus,
  "neutral" | "major" | "success" | "error"
> = {
  pending: "neutral",
  extracting: "neutral",
  classifying: "neutral",
  needs_manual_review: "major",
  complete: "success",
  error: "error",
};

const toneBadgeVariant: Record<TeacherTone, "neutral" | "success" | "major" | "error"> = {
  critical: "error",
  warn: "major",
  ok: "success",
  muted: "neutral",
};

const DEMO_WALKTHROUGH_DISMISS_KEY = "wave2-5-2-demo-walkthrough-dismissed";
const DEMO_SEED_MARKER = "wave2-2-1-demo-seed";
const SWEEP_RETRY_MS = 15_000;

type ActiveSubmissionWatch = {
  status: SubmissionProcessingStatus;
  observedAt: number;
  lastSweepAttemptAt: number | null;
};

function getSubmissionRowDisplay(submission: Submission) {
  const misconceptionCode = submission.analysis?.primaryMisconception ?? "QE_NO_ERROR";
  const priorityLevel = submission.intelligence?.reviewPriority ?? "low";
  const priorityBadge = formatPriority(
    submission.intelligence?.reviewPriorityScore,
    priorityLevel
  );

  return {
    status: {
      variant: statusVariant[submission.processingStatus],
      label: statusLabelEt[submission.processingStatus],
    },
    misconceptionLabel: submission.analysis
      ? getMisconceptionDisplay(misconceptionCode).label
      : "Vajab käsitsi ülevaatust",
    review: submission.teacherReview?.status ?? "unreviewed",
    priorityLevel,
    priorityBadge,
    trustLevel: submission.dataQuality?.trustLevel ?? null,
    extractionSource: submission.analysisMeta?.extractionSource ?? null,
    priorityScore: submission.intelligence?.reviewPriorityScore ?? 0,
  };
}

function truncateChartLabel(label: string) {
  return label.length <= 36 ? label : `${label.slice(0, 33)}…`;
}

export default function AssignmentClient({
  assignmentId,
  demoSeedToken,
  initialAssignment,
  initialClusters,
  initialProgress,
}: Props) {
  const [hasMounted, setHasMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(320);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(initialAssignment);
  const [clusters, setClusters] = useState<Cluster[]>(initialClusters);
  const [progress, setProgress] = useState<ProgressSummary>(initialProgress);
  const [submissionsState, setSubmissionsState] = useState<SubmissionsState>({
    status: "loading",
    data: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState("");
  const [isDemoWalkthroughOpen, setIsDemoWalkthroughOpen] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const activeSubmissionWatchRef = useRef<Record<string, ActiveSubmissionWatch>>({});
  const pendingSweepRef = useRef<Record<string, boolean>>({});

  const resolveClusterLabel = useCallback((cluster: Cluster) => {
    const labelEt = cluster.labelEt?.trim();
    return labelEt ? labelEt : getMisconceptionDisplay(cluster.misconceptionCode).label;
  }, []);

  const refreshCore = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setError("");
      }

      try {
        const [assignmentResponse, clusterResponse, progressResponse] = await Promise.all([
          fetch(`/api/assignments/${assignmentId}`, { cache: "no-store" }),
          fetch(`/api/assignments/${assignmentId}/clusters`, { cache: "no-store" }),
          fetch(`/api/assignments/${assignmentId}/progress`, { cache: "no-store" }),
        ]);

        if (!assignmentResponse.ok) {
          const payload = (await assignmentResponse.json().catch(() => ({}))) as { error?: string };
          if (!silent) setError(payload.error || "Ülesande laadimine ebaõnnestus.");
          return;
        }

        setAssignment((await assignmentResponse.json()) as Assignment);
        setClusters(clusterResponse.ok ? ((await clusterResponse.json()) as Cluster[]) : []);
        if (progressResponse.ok) {
          setProgress((await progressResponse.json()) as ProgressSummary);
        }
      } catch {
        if (!silent) setError("Võrguviga andmete laadimisel.");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [assignmentId]
  );

  const sweepPotentiallyWedgedSubmission = useCallback(async (submissionId: string) => {
    try {
      await fetch(`/api/submissions/${submissionId}/sweep`, { method: "POST" });
    } catch {
      // Best-effort reconciliation; the normal polling loop will retry.
    } finally {
      delete pendingSweepRef.current[submissionId];
    }
  }, []);

  const reconcileActiveSubmissions = useCallback(
    (nextSubmissions: Submission[]) => {
      const now = Date.now();
      const nextWatch: Record<string, ActiveSubmissionWatch> = {};

      for (const submission of nextSubmissions) {
        if (!isActiveSubmissionProcessingStatus(submission.processingStatus)) {
          continue;
        }

        const previous = activeSubmissionWatchRef.current[submission._id];
        const watch =
          previous && previous.status === submission.processingStatus
            ? { ...previous }
            : {
                status: submission.processingStatus,
                observedAt: now,
                lastSweepAttemptAt: null,
              };

        const observedFor = now - watch.observedAt;
        const retryWindowElapsed =
          watch.lastSweepAttemptAt === null || now - watch.lastSweepAttemptAt >= SWEEP_RETRY_MS;
        if (
          observedFor >= PIPELINE_TIMEOUT_OBSERVE_MS &&
          retryWindowElapsed &&
          !pendingSweepRef.current[submission._id]
        ) {
          watch.lastSweepAttemptAt = now;
          pendingSweepRef.current[submission._id] = true;
          void sweepPotentiallyWedgedSubmission(submission._id);
        }

        nextWatch[submission._id] = watch;
      }

      activeSubmissionWatchRef.current = nextWatch;
    },
    [sweepPotentiallyWedgedSubmission]
  );

  const loadSubmissions = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setSubmissionsState((current) =>
        silent ? current : { status: "loading", data: current.data }
      );
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/submissions`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setSubmissionsState((current) => ({
            status: "error",
            data: current.data,
            message: payload.error || "Õpilaste esituste laadimine ebaõnnestus.",
          }));
          return;
        }
        const nextSubmissions = (await response.json()) as Submission[];
        reconcileActiveSubmissions(nextSubmissions);
        setSubmissionsState({ status: "ready", data: nextSubmissions });
      } catch {
        setSubmissionsState((current) => ({
          status: "error",
          data: current.data,
          message: "Võrguviga õpilaste esituste laadimisel.",
        }));
      }
    },
    [assignmentId, reconcileActiveSubmissions]
  );

  const refreshAssignmentView = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      await Promise.all([refreshCore({ silent }), loadSubmissions({ silent })]);
      setLastUpdatedAt(new Date().toISOString());
    },
    [loadSubmissions, refreshCore]
  );

  useEffect(() => {
    setHasMounted(true);
    setLastUpdatedAt(new Date().toISOString());
    void refreshAssignmentView({ silent: true });
  }, [refreshAssignmentView]);

  useEffect(() => {
    if (!hasMounted || !chartContainerRef.current || typeof window === "undefined") return;
    const node = chartContainerRef.current;
    const updateWidth = () => setChartWidth(Math.max(Math.floor(node.clientWidth), 280));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMounted]);

  useEffect(() => {
    if (progress.inFlightCount === 0) return;
    const intervalId = window.setInterval(() => {
      void refreshAssignmentView({ silent: true });
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [progress.inFlightCount, refreshAssignmentView]);

  const submissions = submissionsState.data;
  const reviewQueue = useMemo(
    () =>
      submissions
        .map((submission) => ({ submission, display: getSubmissionRowDisplay(submission) }))
        .filter(
          (item) =>
            item.submission.processingStatus === "complete" &&
            item.display.priorityLevel !== "low" &&
            item.display.review === "unreviewed"
        )
        .sort((left, right) => right.display.priorityScore - left.display.priorityScore)
        .slice(0, 6),
    [submissions]
  );

  const manualReviewSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) => submission.processingStatus === "needs_manual_review"
      ),
    [submissions]
  );
  const totalStudentCount = useMemo(
    () => new Set(submissions.map((submission) => submission.studentKey)).size,
    [submissions]
  );
  const lowTrustCount = useMemo(
    () =>
      new Set(
        submissions
          .filter((submission) => submission.dataQuality?.trustLevel === "low")
          .map((submission) => submission.studentKey)
      ).size,
    [submissions]
  );

  const chartData = useMemo(
    () =>
      clusters
        .slice()
        .sort((a, b) => b.clusterSize - a.clusterSize)
        .map((cluster) => ({
          id: cluster._id,
          label: resolveClusterLabel(cluster),
          clusterSize: cluster.clusterSize,
          severity: cluster.severity,
          fill: severityColor[cluster.severity],
        })),
    [clusters, resolveClusterLabel]
  );

  const chartHeight = Math.max(320, chartData.length * 44);
  const runningSteps =
    progress.statusCounts.extracting + progress.statusCounts.classifying;
  const lastSubmissionLabel = !progress.latestSubmissionAt
    ? "—"
    : hasMounted
      ? new Date(progress.latestSubmissionAt).toLocaleString()
      : "Laadin…";

  const submissionColumns = useMemo(
    () => [
      {
        key: "student",
        header: "Õpilane",
        mobileLabel: "Õpilane",
        cell: (submission: Submission) => (
          <Link
            href={`/student/result/${submission._id}`}
            className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
          >
            {submission.studentName}
          </Link>
        ),
      },
      {
        key: "misconception",
        header: "Väärarusaam",
        mobileLabel: "Viga",
        cell: (submission: Submission) => getSubmissionRowDisplay(submission).misconceptionLabel,
      },
      {
        key: "priority",
        header: "Prioriteet",
        mobileLabel: "Prioriteet",
        cell: (submission: Submission) => {
          const display = getSubmissionRowDisplay(submission);
          return (
            <Badge
              variant={toneBadgeVariant[display.priorityBadge.tone]}
              title={display.priorityBadge.tooltip}
            >
              {display.priorityBadge.label}
            </Badge>
          );
        },
      },
      {
        key: "trust",
        header: "Usaldus",
        mobileLabel: "Usaldus",
        cell: (submission: Submission) => {
          const display = getSubmissionRowDisplay(submission);
          return (
            <TrustTag
              level={display.trustLevel}
              extractionSource={display.extractionSource}
            />
          );
        },
      },
      {
        key: "status",
        header: "Olek",
        mobileLabel: "Olek",
        cell: (submission: Submission) => {
          const display = getSubmissionRowDisplay(submission);
          return <Badge variant={display.status.variant}>{display.status.label}</Badge>;
        },
      },
    ],
    []
  );

  const isDemoAssignment = assignment?.seedMarker
    ? assignment.seedMarker === DEMO_SEED_MARKER
    : assignment?.title.startsWith("[DEMO]") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDemoAssignment) {
      setIsDemoWalkthroughOpen(false);
      return;
    }
    try {
      const isDismissed = window.localStorage.getItem(DEMO_WALKTHROUGH_DISMISS_KEY) === "1";
      setIsDemoWalkthroughOpen(!isDismissed);
    } catch {
      setIsDemoWalkthroughOpen(true);
    }
  }, [isDemoAssignment]);

  const handleCloseDemoWalkthrough = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DEMO_WALKTHROUGH_DISMISS_KEY, "1");
      } catch {}
    }
    setIsDemoWalkthroughOpen(false);
  }, []);

  async function runClustering() {
    setIsClustering(true);
    setError("");
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/cluster`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Klasterdamine ebaõnnestus.");
        return;
      }
      await refreshAssignmentView();
    } catch {
      setError("Võrguviga klasterdamisel.");
    } finally {
      setIsClustering(false);
    }
  }

  async function copySubmissionLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/submit/${assignmentId}`);
      setIsCopying(true);
      window.setTimeout(() => setIsCopying(false), 1200);
    } catch {
      setError("Lingi kopeerimine ebaõnnestus.");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Õpetaja", href: "/teacher" },
          { label: assignment?.title || "Ülesanne" },
        ]}
      />

      {isDemoWalkthroughOpen && <DemoWalkthrough onClose={handleCloseDemoWalkthrough} />}

      {assignment && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{assignment.title}</h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Klass {assignment.gradeLevel} · {assignment.submissionCount} esitust
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={runClustering} disabled={isClustering || !progress.readyForClustering}>
                {isClustering ? "Klastrin…" : "Käivita klasterdamine"}
              </Button>
              {isDemoAssignment ? (
                <DemoSeedCta
                  demoSeedToken={demoSeedToken}
                  label="Lähtesta demo"
                  loadingLabel="Lähtestan…"
                  className="!border-[var(--color-border)] !bg-[var(--color-surface)] !text-[var(--color-text)] hover:!bg-[var(--color-surface-raised)]"
                  errorClassName="text-sm text-[var(--color-error)]"
                />
              ) : null}
              <Button variant="secondary" onClick={() => void refreshAssignmentView()}>
                Värskenda
              </Button>
            </div>
          </div>
          {assignment.description ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">{assignment.description}</p> : null}
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Töös" value={runningSteps} />
        <StatCard label="Valmis" value={progress.completeCount} />
        <StatCard label="Vajab silmi" value={progress.needsManualReviewCount} />
        <StatCard label="Kõrge prioriteet" value={progress.highPriorityReviewCount} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Kontrolli üle" value={progress.highUncertaintyCount} />
        <StatCard label="Kinnitatud" value={progress.reviewedCount} />
        <StatCard label="Muudetud" value={progress.overriddenCount} />
        <StatCard
          label="Viimane esitus"
          value={
            <span className="text-base font-medium" suppressHydrationWarning>
              {lastSubmissionLabel}
            </span>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => void copySubmissionLink()}>
          {isCopying ? "Kopeeritud" : "Kopeeri õpilase link"}
        </Button>
        <Link
          href={`/teacher/assignment/${assignmentId}/analytics`}
          id="demo-analytics-button"
          className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          Ava analüütika
        </Link>
        <Link
          href={`/submit/${assignmentId}`}
          className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          Ava õpilase vaade
        </Link>
        <Link
          href={`/teacher/live/${assignmentId}`}
          className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          Start live session
        </Link>
      </div>

      {!progress.readyForClustering ? (
        <FeedbackBanner
          tone="warning"
          message={`Klasterdamine lukus: ${progress.inFlightCount} esitust on veel töös.`}
        />
      ) : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {isLoading ? <FeedbackBanner tone="info" message="Laadin…" /> : null}

      {manualReviewSubmissions.length > 0 ? (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Vajab sinu pilku</h2>
            <Badge variant="major">{manualReviewSubmissions.length}</Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Need esitused vajavad õpetaja ülevaadet, sest automaatne analüüs peatati
            või ei olnud piisavalt usaldusväärne.
          </p>
          <div className="mt-3 grid gap-2">
            {manualReviewSubmissions.map((submission) => (
              <div
                key={`manual-review-${submission._id}`}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="major">Vajab ülevaatust</Badge>
                  <Link
                    href={`/student/result/${submission._id}`}
                    className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                  >
                    {submission.studentName}
                  </Link>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {getManualReviewMessage(
                    submission.processingError,
                    "Automaatne analüüs peatati, sest sammude eraldamine ebaõnnestus."
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {reviewQueue.length > 0 ? (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Kontrolli järjekord</h2>
            <Badge variant="major">{reviewQueue.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {reviewQueue.map((item) => (
              <div
                key={`review-queue-${item.submission._id}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] p-3"
              >
                <Badge
                  variant={toneBadgeVariant[item.display.priorityBadge.tone]}
                  title={item.display.priorityBadge.tooltip}
                >
                  {item.display.priorityBadge.label}
                </Badge>
                <TrustTag
                  level={item.display.trustLevel}
                  extractionSource={item.display.extractionSource}
                />
                <Link
                  href={`/student/result/${item.submission._id}`}
                  className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                >
                  {item.submission.studentName}
                </Link>
                <span className="text-sm text-[var(--color-text-muted)]">{item.display.misconceptionLabel}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card id="demo-cluster-chart">
        <h2 className="mb-3 text-2xl font-semibold">Väärarusaamade kaardistus</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Klaster pole veel loodud.</p>
        ) : (
          <div ref={chartContainerRef} className="h-80 w-full overflow-y-auto">
            <BarChart
              width={chartWidth}
              height={chartHeight}
              data={chartData}
              layout="vertical"
              margin={{ top: 16, right: 24, bottom: 16, left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                dataKey="clusterSize"
                allowDecimals={false}
                label={{ value: "Õpilaste arv", position: "insideBottom", offset: -8 }}
              />
              <YAxis type="category" dataKey="label" width={220} tickFormatter={truncateChartLabel} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as {
                    label: string;
                    clusterSize: number;
                    severity: Cluster["severity"];
                  };
                  return (
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-sm">
                      <p className="font-medium text-[var(--color-text)]">{point.label}</p>
                      <p className="text-[var(--color-text-muted)]">Õpilasi: {point.clusterSize}</p>
                      <p className="text-[var(--color-text-muted)]">Tõsidus: {severityLabelEt[point.severity]}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="clusterSize" radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Õpilased</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowStudentList((current) => !current)}>
            {showStudentList ? "Peida" : "Näita"}
          </Button>
        </div>
        {showStudentList ? (
          submissionsState.status === "loading" && submissions.length === 0 ? (
            <FeedbackBanner className="mt-3" tone="info" message="Laen õpilaste esitusi…" />
          ) : submissionsState.status === "error" && submissions.length === 0 ? (
            <FeedbackBanner className="mt-3" tone="error" message={submissionsState.message} />
          ) : (
            <ResponsiveTable
              className="mt-4"
              ariaLabel="Õpilaste esitused"
              columns={submissionColumns}
              rows={submissions}
              getRowId={(submission) => submission._id}
              emptyStateTitle="Esitusi pole"
              emptyStateDescription="Lisa vähemalt üks esitus."
            />
          )
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Ava nimekiri ainult vajadusel.</p>
        )}
      </Card>

      <div id="demo-cluster-cards" className="grid gap-3">
        {clusters.map((cluster) => {
          const misconceptionDisplay = getMisconceptionDisplay(cluster.misconceptionCode);
          return (
            <Card key={cluster._id} className="transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-semibold">{resolveClusterLabel(cluster)}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">{misconceptionDisplay.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cluster.severity}>{severityLabelEt[cluster.severity]}</Badge>
                  <Badge variant="neutral">{cluster.clusterSize}</Badge>
                  <Badge
                    variant={
                      cluster.remediationStatus === "failed"
                        ? "error"
                        : cluster.remediationStatus === "ready"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {remediationStatusLabel[cluster.remediationStatus || "pending"]}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/teacher/cluster/${cluster._id}`}
                className="mt-3 inline-block text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
              >
                Ava detail
              </Link>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        Tänane andmestik: {totalStudentCount} õpilast · {lowTrustCount} vajavad ülekontrollimist ·
        {" "}Uuendatud {lastUpdatedAt ? formatRelativeTimeEt(lastUpdatedAt) : "äsja"}.
      </p>
    </div>
  );
}
