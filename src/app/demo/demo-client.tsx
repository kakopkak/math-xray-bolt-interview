"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import type { SubmissionProcessingStatus } from "@/lib/submission-status";

type DemoAssignment = {
  _id: string;
  title: string;
  status: "draft" | "active" | "analyzed";
  seedMarker?: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
};

type DemoCluster = {
  _id: string;
  label?: string;
  labelEt?: string;
  misconceptionCode: string;
  clusterSize: number;
  severity: "none" | "minor" | "major" | "fundamental";
};

type DemoProgress = {
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

type NextMovePreview = {
  nextProblem: {
    promptEt: string;
    answer: string;
  };
  rationaleEt: string;
  teacherMoveEt: string;
  expectedErrorsByCluster: Array<{
    misconceptionCode: string;
    expectedAnswer: string;
    whyTheyWillMissItEt: string;
  }>;
};

type DemoLogEntry = {
  id: string;
  message: string;
  tone: "info" | "success" | "error";
};

type Props = {
  demoToken: string;
  initialAssignment: DemoAssignment | null;
  initialClusters: DemoCluster[];
  initialProgress: DemoProgress | null;
};

type DemoBeat = {
  title: string;
  caption: string;
  href: string;
  ctaLabel: string;
};

const BEAT_DELAY_MS = 6_000;

function getClusterLabel(cluster: DemoCluster) {
  return cluster.labelEt?.trim() || cluster.label?.trim() || getMisconceptionDisplay(cluster.misconceptionCode).label;
}

export default function DemoClient({
  demoToken,
  initialAssignment,
  initialClusters,
  initialProgress,
}: Props) {
  const [assignment, setAssignment] = useState<DemoAssignment | null>(initialAssignment);
  const [clusters, setClusters] = useState<DemoCluster[]>(initialClusters);
  const [progress, setProgress] = useState<DemoProgress | null>(initialProgress);
  const [nextMove, setNextMove] = useState<NextMovePreview | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshingNextMove, setIsRefreshingNextMove] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<DemoLogEntry[]>([]);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  const addLog = useCallback((message: string, tone: DemoLogEntry["tone"] = "info") => {
    const entry: DemoLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      tone,
    };
    setLogs((current) => [entry, ...current].slice(0, 10));
  }, []);

  const clearWalkthroughTimers = useCallback(() => {
    for (const timeoutId of timeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearWalkthroughTimers();
    };
  }, [clearWalkthroughTimers]);

  const refreshDemoState = useCallback(
    async (assignmentId: string) => {
      const [assignmentResponse, clusterResponse, progressResponse] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`, { cache: "no-store" }),
        fetch(`/api/assignments/${assignmentId}/clusters`, { cache: "no-store" }),
        fetch(`/api/assignments/${assignmentId}/progress`, { cache: "no-store" }),
      ]);

      if (!assignmentResponse.ok) {
        const payload = (await assignmentResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Demoülesande laadimine ebaõnnestus.");
      }

      const assignmentPayload = (await assignmentResponse.json()) as DemoAssignment;
      setAssignment(assignmentPayload);

      if (clusterResponse.ok) {
        setClusters((await clusterResponse.json()) as DemoCluster[]);
      }

      if (progressResponse.ok) {
        setProgress((await progressResponse.json()) as DemoProgress);
      }
    },
    []
  );

  const largestCluster = useMemo(() => clusters[0] ?? null, [clusters]);

  const demoBeats = useMemo<DemoBeat[]>(() => {
    const assignmentHref = assignment ? `/teacher/assignment/${assignment._id}` : "/teacher";
    const analyticsHref = assignment
      ? `/teacher/assignment/${assignment._id}/analytics#review-queue`
      : "/teacher";
    const clusterHref = largestCluster
      ? `/teacher/cluster/${largestCluster._id}`
      : assignment
        ? `/teacher/assignment/${assignment._id}/analytics#all-misconceptions`
        : "/teacher";

    return [
      {
        title: "Ava supertöölaud",
        caption: "Näita hommikust ülevaadet, kus kiire fookus ja peamine muster on nähtavad ühe pilguga.",
        href: "/teacher",
        ctaLabel: "Ava supertöölaud",
      },
      {
        title: "Ava kiire õpilase töö",
        caption: "Liigu kohe selle töö juurde, kus õpetaja näeb klassi seisu ja järgmisi vaateid ilma otsimata.",
        href: assignmentHref,
        ctaLabel: "Ava ülesanne",
      },
      {
        title: "Vaata kontrolli järjekorda",
        caption: "Peatu järjekorral ja nimeta, keda annaksid tagasisideks esimesena.",
        href: analyticsHref,
        ctaLabel: "Ava järjekord",
      },
      {
        title: "Ava peamine klaster",
        caption: "Lõpeta klastris, kus korduv viga, näited ja sekkumine on ühes kohas.",
        href: clusterHref,
        ctaLabel: "Ava klaster",
      },
    ];
  }, [assignment, largestCluster]);

  async function performResetDemoData() {
    clearWalkthroughTimers();
    setIsPlaying(false);
    setActiveBeatIndex(0);
    setIsResetting(true);
    setError("");
    try {
      const response = await fetch("/api/assignments/seed", {
        method: "POST",
        headers: {
          "x-demo-token": demoToken,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        assignmentId?: string;
        error?: string;
      };

      if (!response.ok || !payload.assignmentId) {
        throw new Error(payload.error || "Demoandmete lähtestamine ebaõnnestus.");
      }

      await refreshDemoState(payload.assignmentId);
      setNextMove(null);
      addLog("Demoandmed lähtestati ja uus näidisülesanne on valmis.", "success");
      return payload.assignmentId;
    } catch (nextError: unknown) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
      addLog(message, "error");
      return null;
    } finally {
      setIsResetting(false);
    }
  }

  async function playWalkthrough() {
    if (isPlaying) {
      return;
    }

    setError("");
    clearWalkthroughTimers();

    let assignmentId = assignment?._id ?? "";
    if (!assignmentId) {
      assignmentId = (await performResetDemoData()) ?? "";
    }

    if (!assignmentId) {
      setError("Demo ei saa alata enne, kui demoülesanne on loodud.");
      return;
    }

    setIsPlaying(true);
    setActiveBeatIndex(0);
    addLog("4-sammuline demo käivitati. Ava iga beat allolevalt kaardilt.", "info");

    demoBeats.forEach((beat, index) => {
      const timeoutId = window.setTimeout(() => {
        setActiveBeatIndex(index);
        addLog(`Samm ${index + 1}/4: ${beat.title}.`, "success");
      }, index * BEAT_DELAY_MS);
      timeoutsRef.current.push(timeoutId);
    });

    const finalizeTimeoutId = window.setTimeout(() => {
      setIsPlaying(false);
      addLog("4-sammuline demo jõudis lõppu. Ava viimane beat ja lõpeta klastrivaates.", "success");
    }, demoBeats.length * BEAT_DELAY_MS);
    timeoutsRef.current.push(finalizeTimeoutId);
  }

  async function forceNextMoveRefresh() {
    if (!assignment?._id) {
      setError("Demoülesanne puudub. Lähtesta demoandmed enne järgmise sammu loomist.");
      return;
    }

    setIsRefreshingNextMove(true);
    setError("");
    try {
      const response = await fetch(`/api/assignments/${assignment._id}/next-move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ forceRefresh: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as NextMovePreview & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Järgmise sammu värskendamine ebaõnnestus.");
      }

      setNextMove(payload);
      addLog("Järgmise sammu soovitus sunniti uuesti arvutama.", "success");
    } catch (nextError: unknown) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
      addLog(message, "error");
    } finally {
      setIsRefreshingNextMove(false);
    }
  }

  const statusPills = useMemo(() => {
    if (!progress) {
      return [];
    }

    return [
      { label: "Töös", value: progress.inFlightCount },
      { label: "Valmis", value: progress.completeCount },
      { label: "Vajab ülevaatust", value: progress.needsManualReviewCount },
      { label: "Kõrge prioriteet", value: progress.highPriorityReviewCount },
    ];
  }, [progress]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Breadcrumbs items={[{ label: "Matemaatika Röntgen", href: "/" }, { label: "Demo juhtpult" }]} />

      <SectionHeader
        title="Demo juhtpult"
        description="Siit juhid näidisandmeid ja käivitad kohtuniku-demo päris süsteemi peal."
        actions={
          assignment ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/teacher/assignment/${assignment._id}`}
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                Ava demoülesanne
              </Link>
              <Link
                href={`/teacher/assignment/${assignment._id}/analytics`}
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                Ava analüütika
              </Link>
            </div>
          ) : null
        }
      />

      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Esitusi kokku" value={progress?.totalSubmissions ?? assignment?.submissionCount ?? 0} />
        <StatCard label="Klastreid" value={clusters.length} />
        <StatCard label="Töös" value={progress?.inFlightCount ?? 0} />
        <StatCard label="Kõrge prioriteet" value={progress?.highPriorityReviewCount ?? 0} />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Demo olek
            </p>
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              {assignment ? assignment.title : "Demoülesannet pole veel loodud"}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {assignment
                ? `Ülesande ID: ${assignment._id} · Olek: ${assignment.status}`
                : "Lähtesta demoandmed, et luua uus näidisülesanne ja klastrid."}
            </p>
            <div className="flex flex-wrap gap-2">
              {statusPills.map((pill) => (
                <Badge key={pill.label} variant="neutral">
                  {pill.label}: {pill.value}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsResetConfirmOpen(true)} loading={isResetting}>
              Lähtesta demoandmed
            </Button>
            <Button variant="secondary" onClick={() => void playWalkthrough()} loading={isPlaying} disabled={isResetting}>
              Käivita 4-sammuline demo
            </Button>
            <Button
              variant="secondary"
              onClick={() => void forceNextMoveRefresh()}
              loading={isRefreshingNextMove}
              disabled={!assignment?._id}
            >
              Sunni uus järgmine samm
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              4-sammuline demo
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">Kohtumise valmisrehearsal</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Iga beat viib päris õpetajavaatesse. Kasuta kaarte järjekorras: supertöölaud, ülesanne, järjekord, klaster.
            </p>
          </div>
          <Badge variant="neutral">Samm {activeBeatIndex + 1}/4</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {demoBeats.map((beat, index) => {
            const isActive = index === activeBeatIndex;

            return (
              <div
                key={beat.title}
                className={`rounded-2xl border p-4 transition-colors ${
                  isActive
                    ? "border-[color-mix(in_oklab,var(--color-brand)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-brand)_10%,var(--color-surface-raised))]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={isActive ? "major" : "neutral"}>Samm {index + 1}</Badge>
                  {isActive ? <Badge variant="success">Praegu fookuses</Badge> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--color-text)]">{beat.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{beat.caption}</p>
                <Link
                  href={beat.href}
                  className="mt-4 inline-flex rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                >
                  {beat.ctaLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </Card>

      {nextMove ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Viimane järgmine samm
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">{nextMove.nextProblem.promptEt}</h2>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">{nextMove.rationaleEt}</p>
          <p className="mt-3 text-sm font-medium text-[var(--color-text)]">{nextMove.teacherMoveEt}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Klastrihüpped</h2>
            <Badge variant="neutral">{clusters.length}</Badge>
          </div>
          {clusters.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Klastreid pole veel. Lähtesta demo või lõpeta näidisvoor, et need uuesti tekitada.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {clusters.slice(0, 6).map((cluster) => (
                <Link
                  key={cluster._id}
                  href={`/teacher/cluster/${cluster._id}`}
                  className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)]"
                >
                  Ava klaster: {getClusterLabel(cluster)} ({cluster.clusterSize})
                </Link>
              ))}
            </div>
          )}
          {largestCluster ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Suurim klaster on praegu <span className="font-medium text-[var(--color-text)]">{getClusterLabel(largestCluster)}</span>.
            </p>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Sündmuste logi</h2>
            <Badge variant="neutral">{logs.length}</Badge>
          </div>
          {logs.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Veel vaikne. Käivita üks demo-tegevus ja logi täitub siia.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-3 text-sm ${
                    log.tone === "error"
                      ? "border-[color-mix(in_oklab,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-error)_10%,var(--color-surface))]"
                      : log.tone === "success"
                        ? "border-[color-mix(in_oklab,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-success)_10%,var(--color-surface))]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                  }`}
                >
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isResetConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Kinnita lähtestus
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">Lähtestame demoandmed uuesti</h2>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Kustutame ja laeme uuesti 18 demo-õpilast. Jätka?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsResetConfirmOpen(false)}>
                Loobu
              </Button>
              <Button
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  void performResetDemoData();
                }}
                loading={isResetting}
              >
                Jätka
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
