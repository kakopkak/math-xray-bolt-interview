"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TrustTag } from "@/components/ui/trust-tag";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import { formatRelativeTimeEt } from "@/lib/relative-time";
import { formatPriority, type TeacherTone } from "@/lib/teacher-copy";
import type { SubmissionProcessingStatus } from "@/lib/submission-status";

type Submission = {
  _id: string;
  studentName: string;
  studentKey?: string;
  classKey?: string;
  processingStatus: SubmissionProcessingStatus;
  extractedSteps: Array<{
    stepNumber: number;
    content: string;
    isCorrect: boolean;
    misconceptionCode?: string;
    explanation?: string;
  }>;
  analysis: {
    primaryMisconception: string;
    firstErrorStep: number | null;
  } | null;
  analysisMeta?: {
    averageConfidence: number;
    deterministicGateApplied: boolean;
    extractionSource?: "ai" | "heuristic";
  } | null;
  intelligence?: {
    uncertaintyLevel: "low" | "medium" | "high";
    reviewPriority: "low" | "medium" | "high";
    reviewPriorityScore: number;
  } | null;
  dataQuality?: {
    trustLevel?: "high" | "medium" | "low";
  } | null;
  teacherReview?: {
    status: "unreviewed" | "reviewed" | "overridden";
    note: string;
  } | null;
};

type ClusterSubCluster = {
  id: string;
  label: string;
  labelEt: string;
  size: number;
  memberSubmissionIds: string[];
  memberStudentNames: string[];
  representativeExample: string;
  dominantPattern: string;
  remediationHint: string;
};

type Cluster = {
  _id: string;
  label: string;
  labelEt: string;
  misconceptionCode: string;
  clusterSize: number;
  severity?: "none" | "minor" | "major" | "fundamental";
  evidenceSummary?: {
    firstErrorStepDistribution: Array<{
      stepNumber: number;
      count: number;
      percentage: number;
    }>;
    averageConfidence: number;
    lowConfidenceShare: number;
  } | null;
  subClusters?: ClusterSubCluster[];
  remediationExercises: Array<{
    id: string;
    difficulty: "scaffolded" | "standard" | "transfer";
    promptEt: string;
    prompt: string;
    hint?: string;
    solutionSteps: string[];
  }>;
  remediationStatus?: "pending" | "ready" | "failed";
  remediationError?: string;
  topic?: string;
  assignmentId?: string;
};

type ClusterPayload = {
  cluster: Cluster;
  submissions: Submission[];
};

type Props = {
  clusterId: string;
  initialPayload: ClusterPayload | null;
};

const EMPTY_SUBMISSIONS: Submission[] = [];

const reviewLabel: Record<"unreviewed" | "reviewed" | "overridden", string> = {
  unreviewed: "Kontrollimata",
  reviewed: "Kinnitatud",
  overridden: "Muudetud",
};

export const remediationStatusLabel: Record<"pending" | "ready" | "failed", string> = {
  pending: "töös",
  ready: "valmis",
  failed: "viga",
};

export const severityLabelEt: Record<NonNullable<Cluster["severity"]>, string> = {
  none: "puudub",
  minor: "kerge",
  major: "suur",
  fundamental: "fundamentaalne",
};

export const processingStatusLabelEt: Record<SubmissionProcessingStatus, string> = {
  pending: "Järjekorras",
  extracting: "Sammud",
  classifying: "Tuvastus",
  needs_manual_review: "Vajab ülevaatust",
  complete: "Valmis",
  error: "Viga",
};

export const difficultyLabelEt: Record<"scaffolded" | "standard" | "transfer", string> = {
  scaffolded: "Juhendatud",
  standard: "Tavaseeria",
  transfer: "Ülekanne",
};

export const CLUSTER_TOKEN_CLASS_CONTRACT = {
  mutedText: "text-[var(--color-text-muted)]",
  raisedPanel: "border-[var(--color-border)] bg-[var(--color-surface-raised)]",
} as const;

const LEGACY_CLUSTER_PALETTE_PATTERN = /(text|bg|border)-(zinc|rose|emerald)-\d{2,3}/;

export function hasLegacyClusterPaletteClass(value: string): boolean {
  return LEGACY_CLUSTER_PALETTE_PATTERN.test(value);
}

export function buildClusterRemediationEndpoint(clusterId: string): string {
  return `/api/clusters/${clusterId}/remediate`;
}

function badgeVariantForTone(tone: TeacherTone) {
  switch (tone) {
    case "critical":
      return "error";
    case "warn":
      return "major";
    case "ok":
      return "success";
    default:
      return "neutral";
  }
}

export default function ClusterClient({ clusterId, initialPayload }: Props) {
  const [payload, setPayload] = useState<ClusterPayload | null>(initialPayload);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [openStepsBySubmissionId, setOpenStepsBySubmissionId] = useState<Record<string, boolean>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [activeSubClusterId, setActiveSubClusterId] = useState<string | null>(null);
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<string[]>([]);
  const [isPushingHomework, setIsPushingHomework] = useState(false);
  const [homeworkLinks, setHomeworkLinks] = useState<Array<{ studentKey: string; solveLink: string }>>([]);
  const submissions = payload?.submissions ?? EMPTY_SUBMISSIONS;
  const totalStudentCount = new Set(
    submissions.map((submission) => submission.studentKey || submission.studentName)
  ).size;
  const lowTrustCount = new Set(
    submissions
      .filter((submission) => submission.dataQuality?.trustLevel === "low")
      .map((submission) => submission.studentKey || submission.studentName)
  ).size;
  const heuristicCount = submissions.filter(
    (submission) => submission.analysisMeta?.extractionSource === "heuristic"
  ).length;
  const heuristicShare = submissions.length === 0 ? 0 : heuristicCount / submissions.length;

  const tableRows = submissions.map((submission) => ({
    id: submission._id,
    studentKey: submission.studentKey || submission.studentName,
    name: submission.studentName,
    misconception: getMisconceptionDisplay(submission.analysis?.primaryMisconception || "QE_NO_ERROR", "et").label,
    firstErrorStep: submission.analysis?.firstErrorStep ?? null,
    priorityBadge: formatPriority(
      submission.intelligence?.reviewPriorityScore || 0,
      submission.intelligence?.reviewPriority || "low"
    ),
    trustLevel: submission.dataQuality?.trustLevel ?? null,
    extractionSource: submission.analysisMeta?.extractionSource ?? null,
    review: submission.teacherReview?.status || "unreviewed",
  }));
  const allStudentKeys = [...new Set(tableRows.map((row) => row.studentKey))];

  useEffect(() => {
    setLastUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    setSelectedStudentKeys((current) =>
      current.filter((studentKey) =>
        submissions.some(
          (submission) => (submission.studentKey || submission.studentName) === studentKey
        )
      )
    );
  }, [submissions]);

  async function fetchCluster() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/clusters/${clusterId}`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Klastri laadimine ebaõnnestus.");
        return;
      }
      setPayload((await response.json()) as ClusterPayload);
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      setError("Võrguviga klastri laadimisel.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateRemediation() {
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch(buildClusterRemediationEndpoint(clusterId), { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Harjutuste genereerimine ebaõnnestus.");
        return;
      }
      await fetchCluster();
    } catch {
      setError("Võrguviga harjutuste genereerimisel.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function pushHomeworkToSelected() {
    if (selectedStudentKeys.length === 0) {
      setError("Vali vähemalt üks õpilane enne saatmist.");
      return;
    }

    const classKey = submissions.find((submission) => submission.classKey)?.classKey || "";
    if (!classKey) {
      setError("Klassi võti puudub kodutöö saatmiseks.");
      return;
    }

    const primaryExercise = cluster.remediationExercises[0];
    if (!primaryExercise) {
      setError("Genereeri enne harjutused, et kodutööd saata.");
      return;
    }

    setIsPushingHomework(true);
    setError("");
    try {
      const response = await fetch("/api/homework/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentKeys: selectedStudentKeys,
          classKey,
          assignmentId: cluster.assignmentId || "",
          topic: cluster.topic || "quadratic_equations",
          clusterId: cluster._id,
          severity: cluster.severity && cluster.severity !== "none" ? cluster.severity : "major",
          title: primaryExercise.promptEt || primaryExercise.prompt,
          promptEt: primaryExercise.promptEt || primaryExercise.prompt,
          answerKey: primaryExercise.solutionSteps.join("\n") || "Kontrolli koos õpetajaga",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        assignments?: Array<{ studentKey: string; shareToken: string }>;
      };
      if (!response.ok) {
        setError(body.error || "Kodutöö saatmine ebaõnnestus.");
        return;
      }

      const nextLinks = (body.assignments || []).map((assignment) => ({
        studentKey: assignment.studentKey,
        solveLink: `/solve/${assignment.shareToken}`,
      }));
      setHomeworkLinks(nextLinks);
    } catch {
      setError("Võrguviga kodutöö saatmisel.");
    } finally {
      setIsPushingHomework(false);
    }
  }

  const clusterSubClusters = payload?.cluster?.subClusters;
  const subClusters = clusterSubClusters?.length ? clusterSubClusters : [];
  const activeSubCluster =
    subClusters.find((item) => item.id === activeSubClusterId) || subClusters[0] || null;

  useEffect(() => {
    if (!clusterSubClusters?.length) {
      if (activeSubClusterId !== null) {
        setActiveSubClusterId(null);
      }
      return;
    }
    if (!activeSubClusterId || !clusterSubClusters.some((item) => item.id === activeSubClusterId)) {
      setActiveSubClusterId(clusterSubClusters[0].id);
    }
  }, [clusterSubClusters, activeSubClusterId]);

  if (isLoading) {
    return <FeedbackBanner tone="info" message="Klastri laadimine…" />;
  }

  if (!payload) {
    return <FeedbackBanner tone="error" message={error || "Klaster puudub."} />;
  }

  const { cluster } = payload;
  const misconception = getMisconceptionDisplay(cluster.misconceptionCode, "et");
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Õpetaja", href: "/teacher" },
          { label: "Klaster" },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{cluster.labelEt || cluster.label}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {cluster.clusterSize} õpilast · {misconception.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={cluster.severity || "neutral"}>{cluster.severity ? severityLabelEt[cluster.severity] : "klaster"}</Badge>
            <Badge
              variant={
                cluster.remediationStatus === "failed"
                  ? "error"
                  : cluster.remediationStatus === "ready"
                    ? "success"
                    : "neutral"
              }
            >
              Harjutused: {remediationStatusLabel[cluster.remediationStatus || "pending"]}
            </Badge>
          </div>
        </div>
      </Card>

      {heuristicShare > 0.3 ? (
        <FeedbackBanner
          tone="warning"
          message="Osa õpilasi tuvastati automaatse lugemisega. Kontrolli vajadusel pildi-kaader."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Tuvastus sobis" value={`${((cluster.evidenceSummary?.averageConfidence || 0) * 100).toFixed(0)}%`} />
        <StatBlock label="Kontrolli üle" value={`${(cluster.evidenceSummary?.lowConfidenceShare || 0).toFixed(1)}%`} />
        <StatBlock
          label="Varajane murdumine"
          value={
            cluster.evidenceSummary?.firstErrorStepDistribution.find((item) => item.stepNumber <= 2)?.count || 0
          }
        />
        <StatBlock
          label="Vajab silmi kohe"
          value={tableRows.filter((row) => row.priorityBadge.label === "Kõrge prioriteet").length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generateRemediation} disabled={isGenerating || cluster.remediationStatus === "pending"}>
          {isGenerating ? "Genereerin…" : "Genereeri harjutused"}
        </Button>
        <Button variant="secondary" onClick={() => void fetchCluster()}>
          Värskenda
        </Button>
      </div>

      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/teacher/topic/${cluster.topic || 'quadratic_equations'}`}
          className="inline-flex items-center rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
        >
          Õpetaja märkmik
        </a>
      </div>
      <Card>
        <h2 className="text-2xl font-semibold">Ala-klastrid</h2>
        {!cluster.subClusters?.length ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Selles klastris ei ole veel piisavalt andmeid alamustrite kuvamiseks.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {subClusters.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={activeSubCluster?.id === item.id ? "secondary" : "ghost"}
                  onClick={() => setActiveSubClusterId(item.id)}
                >
                  {item.labelEt || item.label} · {item.size}
                </Button>
              ))}
            </div>
            {activeSubCluster ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {activeSubCluster.labelEt || activeSubCluster.label}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {activeSubCluster.dominantPattern}
                </p>
                {activeSubCluster.representativeExample ? (
                  <p className="mt-2 text-sm text-[var(--color-text)]">
                    Näide: {activeSubCluster.representativeExample}
                  </p>
                ) : null}
                {activeSubCluster.remediationHint ? (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Soovitus: {activeSubCluster.remediationHint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Õpilased</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSelectedStudentKeys(allStudentKeys)}>
            Vali kõik
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedStudentKeys([])}>
            Tühjenda valik
          </Button>
          <Button
            size="sm"
            onClick={() => void pushHomeworkToSelected()}
            disabled={isPushingHomework || selectedStudentKeys.length === 0}
          >
            {isPushingHomework ? "Saadan…" : "Saada valitutele kodutöö"}
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">{selectedStudentKeys.length} valitud</p>
        </div>
        {homeworkLinks.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {homeworkLinks.map((assignment) => (
              <li key={`${assignment.studentKey}-${assignment.solveLink}`} className="text-[var(--color-text-muted)]">
                {assignment.studentKey}: <a href={assignment.solveLink} className="underline">{assignment.solveLink}</a>
              </li>
            ))}
          </ul>
        ) : null}
        <ResponsiveTable
          className="mt-4"
          ariaLabel="Klastri õpilased"
          rows={tableRows}
          getRowId={(row) => row.id}
          columns={[
            {
              key: "select",
              header: "Vali",
              cell: (row) => (
                <input
                  type="checkbox"
                  aria-label={`Vali ${row.name}`}
                  checked={selectedStudentKeys.includes(row.studentKey)}
                  onChange={() =>
                    setSelectedStudentKeys((current) =>
                      current.includes(row.studentKey)
                        ? current.filter((studentKey) => studentKey !== row.studentKey)
                        : [...current, row.studentKey]
                    )
                  }
                />
              ),
            },
            {
              key: "name",
              header: "Õpilane",
              cell: (row) => row.name,
            },
            {
              key: "misconception",
              header: "Väärarusaam",
              cell: (row) => row.misconception,
            },
            {
              key: "firstError",
              header: "Esimene viga",
              cell: (row) => (row.firstErrorStep ? `Samm ${row.firstErrorStep}` : "—"),
            },
            {
              key: "priority",
              header: "Prioriteet",
              cell: (row) => (
                <Badge
                  variant={badgeVariantForTone(row.priorityBadge.tone)}
                  title={row.priorityBadge.tooltip}
                >
                  {row.priorityBadge.label}
                </Badge>
              ),
            },
            {
              key: "trust",
              header: "Usaldus",
              cell: (row) => (
                <TrustTag level={row.trustLevel} extractionSource={row.extractionSource} />
              ),
            },
            {
              key: "review",
              header: "Õpetaja",
              cell: (row) => <Badge variant={row.review === "overridden" ? "major" : row.review === "reviewed" ? "success" : "neutral"}>{reviewLabel[row.review]}</Badge>,
            },
          ]}
          emptyStateTitle="Õpilasi pole"
          emptyStateDescription="Selles klastris pole esitusi."
        />
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Sammud (vajadusel)</h2>
        <div className="mt-3 space-y-3">
          {submissions.map((submission) => (
            <div key={submission._id} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-text)]">{submission.studentName}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setOpenStepsBySubmissionId((current) => ({
                      ...current,
                      [submission._id]: !current[submission._id],
                    }))
                  }
                >
                  {openStepsBySubmissionId[submission._id] ? "Peida" : "Näita"}
                </Button>
              </div>
              {openStepsBySubmissionId[submission._id] ? (
                <ol className="mt-2 space-y-2">
                  {submission.extractedSteps.map((step) => (
                    <li
                      key={`${submission._id}-${step.stepNumber}`}
                      className={`rounded-lg border p-2 text-sm ${
                        step.isCorrect
                          ? "border-[color-mix(in_oklab,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-success)_12%,var(--color-surface))]"
                          : "border-[color-mix(in_oklab,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-error)_12%,var(--color-surface))]"
                      }`}
                    >
                      <p className="font-semibold">Samm {step.stepNumber}</p>
                      <p>{step.content}</p>
                      {!step.isCorrect ? (
                        <p className="mt-1 text-xs text-[var(--color-error)]">
                          {getMisconceptionDisplay(step.misconceptionCode || "QE_WRONG_METHOD", "et").label}
                          {step.explanation ? ` · ${step.explanation}` : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Harjutused</h2>
        {cluster.remediationStatus === "pending" ? (
          <FeedbackBanner tone="info" message="Harjutused valmivad taustal." />
        ) : cluster.remediationStatus === "failed" ? (
          <FeedbackBanner
            tone="error"
            message={`Harjutuste genereerimine ebaõnnestus${cluster.remediationError ? `: ${cluster.remediationError}` : ""}.`}
          />
        ) : cluster.remediationExercises.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Harjutused puuduvad.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {cluster.remediationExercises.map((exercise) => (
              <div key={exercise.id} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" className="uppercase">
                    {difficultyLabelEt[exercise.difficulty] || exercise.difficulty}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{exercise.promptEt || exercise.prompt}</p>
                {exercise.hint ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">Vihje: {exercise.hint}</p> : null}
                {exercise.solutionSteps.length > 0 ? (
                  <details className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)]">Sammud</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[var(--color-text-muted)]">
                      {exercise.solutionSteps.map((step, index) => (
                        <li key={`${exercise.id}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-sm text-[var(--color-text-muted)]">
        Tänane andmestik: {totalStudentCount} õpilast · {lowTrustCount} vajavad ülekontrollimist ·
        {" "}Uuendatud {lastUpdatedAt ? formatRelativeTimeEt(lastUpdatedAt) : "äsja"}.
      </p>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
