"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { SectionHeader } from "@/components/ui/section-header";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import { getManualReviewMessage } from "@/lib/pipeline-timeout";
import type { SubmissionProcessingStatus } from "@/lib/submission-status";

type Submission = {
  _id: string;
  studentName: string;
  processingStatus: SubmissionProcessingStatus;
  processingError: string;
  extractedSteps: Array<{
    stepNumber: number;
    content: string;
    isCorrect: boolean;
    isPartial?: boolean;
    misconceptionCode?: string;
    explanation?: string;
  }>;
  analysis: {
    overallCorrect: boolean;
    finalAnswerCorrect: boolean;
    primaryMisconception: string;
    strengthAreas: string[];
  } | null;
  analysisMeta?: {
    extractionSource: "ai" | "heuristic";
    classificationSource: "ai" | "heuristic" | "not_run";
    averageConfidence: number;
    deterministicGateApplied: boolean;
    deterministicGateReason: string;
  } | null;
  intelligence?: {
    uncertaintyLevel: "low" | "medium" | "high";
  } | null;
  clusterId: string | null;
};

type RemediationExercise = {
  id: string;
  difficulty: string;
  prompt: string;
  promptEt: string;
  hint?: string;
  solutionSteps: string[];
};

type Props = {
  submissionId: string;
  initialSubmission: Submission | null;
  initialExercises: RemediationExercise[];
};

const statusLabel: Record<SubmissionProcessingStatus, string> = {
  pending: "Järjekorras",
  extracting: "Sammud",
  classifying: "Tuvastus",
  needs_manual_review: "Vajab ülevaatust",
  complete: "Valmis",
  error: "Viga",
};

const difficultyLabelEt: Record<string, string> = {
  scaffolded: "Juhendatud",
  standard: "Tavaseeria",
  transfer: "Ülekanne",
};

export default function ResultClient({ submissionId, initialSubmission, initialExercises }: Props) {
  const [submission, setSubmission] = useState<Submission | null>(initialSubmission);
  const [exercises, setExercises] = useState<RemediationExercise[]>(initialExercises);
  const [isLoading, setIsLoading] = useState(!initialSubmission);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [showSteps, setShowSteps] = useState(false);
  const [animatedErrorSteps, setAnimatedErrorSteps] = useState<number[]>([]);
  const [error, setError] = useState("");
  const animationTimeoutsRef = useRef<number[]>([]);

  const loadExercisesForCluster = useCallback(async (clusterId: string | null) => {
    if (!clusterId) {
      setExercises([]);
      return;
    }

    const clusterResponse = await fetch(`/api/clusters/${clusterId}`, { cache: "no-store" });
    if (!clusterResponse.ok) {
      return;
    }

    const clusterPayload = (await clusterResponse.json()) as {
      cluster?: { remediationExercises?: RemediationExercise[] };
    };
    setExercises(clusterPayload.cluster?.remediationExercises || []);
  }, []);

  const fetchResult = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setError("");
      }

      try {
        const submissionResponse = await fetch(`/api/submissions/${submissionId}`, { cache: "no-store" });
        if (!submissionResponse.ok) {
          const payload = (await submissionResponse.json().catch(() => ({}))) as { error?: string };
          if (!silent) setError(payload.error || "Tulemust ei õnnestunud laadida.");
          return;
        }

        const submissionData = (await submissionResponse.json()) as Submission;
        setSubmission(submissionData);
        await loadExercisesForCluster(submissionData.clusterId);
      } catch {
        if (!silent) setError("Võrguviga tulemuse laadimisel.");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [loadExercisesForCluster, submissionId]
  );

  useEffect(() => {
    if (!submission) {
      void fetchResult({ silent: false });
      return;
    }

    const isTerminal =
      submission.processingStatus === "complete" ||
      submission.processingStatus === "needs_manual_review" ||
      submission.processingStatus === "error";
    if (isTerminal) {
      return;
    }

    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      const intervalId = window.setInterval(() => {
        void fetchResult({ silent: true });
      }, 3000);
      return () => window.clearInterval(intervalId);
    }

    const eventSource = new EventSource(`/api/submissions/${submissionId}/stream`);

    const handleUpdate = (event: MessageEvent<string>) => {
      const nextSubmission = JSON.parse(event.data) as Submission;
      setSubmission(nextSubmission);
      if (nextSubmission.extractedSteps.length > 0) {
        setShowSteps(true);
      }
      void loadExercisesForCluster(nextSubmission.clusterId);
    };

    const handleDone = () => {
      eventSource.close();
      void fetchResult({ silent: true });
    };

    const handleStreamError = () => {
      eventSource.close();
    };

    eventSource.addEventListener("update", handleUpdate as EventListener);
    eventSource.addEventListener("done", handleDone);
    eventSource.addEventListener("error", handleStreamError);

    return () => {
      eventSource.removeEventListener("update", handleUpdate as EventListener);
      eventSource.removeEventListener("done", handleDone);
      eventSource.removeEventListener("error", handleStreamError);
      eventSource.close();
    };
  }, [fetchResult, loadExercisesForCluster, submission, submissionId]);

  async function retryAnalysis() {
    setIsRetrying(true);
    setError("");
    try {
      const response = await fetch(`/api/submissions/${submissionId}/retry`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Analüüsi taaskäivitus ebaõnnestus.");
        return;
      }
      await fetchResult({ silent: false });
    } catch {
      setError("Võrguviga analüüsi taaskäivitamisel.");
    } finally {
      setIsRetrying(false);
    }
  }

  async function copyResultLink() {
    if (isCopying) return;

    setIsCopying(true);
    setCopyStatus("idle");
    try {
      const resultUrl = `${window.location.origin}/student/result/${submissionId}`;
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API puudub");
      }
      await navigator.clipboard.writeText(resultUrl);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    } finally {
      setIsCopying(false);
    }
  }

  const requiresTeacherReview =
    submission?.processingStatus === "needs_manual_review" ||
    submission?.intelligence?.uncertaintyLevel === "high";

  const teacherReviewMessage = useMemo(() => {
    if (!submission || !requiresTeacherReview) {
      return "";
    }

    if (submission.processingStatus === "needs_manual_review") {
      return getManualReviewMessage(
        submission.processingError,
        "Su õpetaja vaatab selle ülesande üle, enne kui detailne tagasiside avaneb."
      );
    }

    return "Su õpetaja vaatab selle ülesande üle, enne kui detailne tagasiside avaneb.";
  }, [requiresTeacherReview, submission]);

  useEffect(() => {
    for (const timeoutId of animationTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    animationTimeoutsRef.current = [];

    if (!submission || submission.processingStatus !== "complete" || requiresTeacherReview) {
      setAnimatedErrorSteps([]);
      return;
    }

    const wrongSteps = submission.extractedSteps.filter((step) => !step.isCorrect && !step.isPartial);
    setAnimatedErrorSteps([]);
    if (submission.extractedSteps.length > 0) {
      setShowSteps(true);
    }

    wrongSteps.forEach((step, index) => {
      const timeoutId = window.setTimeout(() => {
        setAnimatedErrorSteps((current) =>
          current.includes(step.stepNumber) ? current : [...current, step.stepNumber]
        );
      }, index * 200);
      animationTimeoutsRef.current.push(timeoutId);
    });

    return () => {
      for (const timeoutId of animationTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      animationTimeoutsRef.current = [];
    };
  }, [requiresTeacherReview, submission]);

  const isLiveExtraction =
    submission?.processingStatus === "extracting" || submission?.processingStatus === "classifying";

  const conciseSummary = useMemo(() => {
    if (!submission?.analysis || requiresTeacherReview) return null;
    return {
      misconceptionLabel: getMisconceptionDisplay(submission.analysis.primaryMisconception, "et").label,
      finalAnswer: submission.analysis.finalAnswerCorrect ? "Õige" : "Vajab parandust",
    };
  }, [requiresTeacherReview, submission]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Card className="h-28 animate-pulse bg-[var(--color-surface-raised)]"> </Card>
        <Card className="h-40 animate-pulse bg-[var(--color-surface-raised)]"> </Card>
      </div>
    );
  }

  if (!submission) {
    return <FeedbackBanner tone="error" message={error || "Tulemust ei leitud."} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Matemaatika Röntgen", href: "/" },
          { label: "Õpilase tulemus" },
        ]}
      />

      <Card>
        <SectionHeader
          title="Analüüsi tulemus"
          description={submission.studentName}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void fetchResult({ silent: false })}>
                Värskenda
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void copyResultLink()} disabled={isCopying}>
                {copyStatus === "success" ? "Kopeeritud" : "Kopeeri link"}
              </Button>
              {submission.processingStatus === "error" ? (
                <Button size="sm" onClick={() => void retryAnalysis()} disabled={isRetrying}>
                  {isRetrying ? "Taaskäivitan…" : "Proovi uuesti"}
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              submission.processingStatus === "error"
                ? "error"
                : submission.processingStatus === "needs_manual_review"
                  ? "major"
                  : "neutral"
            }
          >
            {statusLabel[submission.processingStatus]}
          </Badge>
        </div>

        {requiresTeacherReview ? (
          <FeedbackBanner className="mt-3" tone="warning" message={teacherReviewMessage} />
        ) : null}
        {submission.processingError && submission.processingStatus !== "needs_manual_review" ? (
          <FeedbackBanner className="mt-3" tone="error" message={submission.processingError} />
        ) : null}
        {error ? <FeedbackBanner className="mt-3" tone="error" message={error} /> : null}
        {copyStatus === "error" ? (
          <FeedbackBanner className="mt-3" tone="warning" message="Kopeerimine ebaõnnestus." />
        ) : null}
      </Card>

      {conciseSummary ? (
        <Card>
          <h2 className="text-2xl font-semibold">Kokkuvõte</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Põhiviga" value={conciseSummary.misconceptionLabel} />
            <MiniStat label="Lõppvastus" value={conciseSummary.finalAnswer} />
          </div>
          {submission.analysis?.strengthAreas.length ? (
            <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
              {submission.analysis.strengthAreas.map((area, index) => (
                <li key={`${submission._id}-strength-${index}`}>- {area}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">
            {isLiveExtraction ? "AI loeb su lahendust" : "Sammud"}
          </h2>
          {requiresTeacherReview || isLiveExtraction ? null : (
            <Button size="sm" variant="secondary" onClick={() => setShowSteps((current) => !current)}>
              {showSteps ? "Peida" : "Näita"}
            </Button>
          )}
        </div>
        {requiresTeacherReview ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Detailne sammupõhine tagasiside avaneb pärast õpetaja ülevaatust.
          </p>
        ) : isLiveExtraction && submission.extractedSteps.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Esimesed sammud ilmuvad siia kohe, kui lahendus on läbi loetud.
          </p>
        ) : isLiveExtraction || showSteps ? (
          submission.extractedSteps.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {(submission.extractedSteps || []).map((step, index) => {
                const shouldHighlightError = !step.isCorrect && animatedErrorSteps.includes(step.stepNumber);
                const isPartialStep = Boolean(step.isPartial);

                return (
                  <li
                    key={`${submission._id}-step-${step.stepNumber}`}
                    className={`rounded-xl border p-3 text-sm transition-colors duration-300 ${
                      isPartialStep || isLiveExtraction
                        ? "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                        : step.isCorrect
                          ? "border-[color-mix(in_oklab,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-success)_12%,var(--color-surface))]"
                          : shouldHighlightError
                            ? "border-[color-mix(in_oklab,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-error)_12%,var(--color-surface))]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    <p className="font-semibold">Samm {step.stepNumber}</p>
                    <p className="mt-1">
                      {step.content}
                      {isPartialStep && index === submission.extractedSteps.length - 1 ? (
                        <span className="ml-1 inline-block animate-pulse text-[var(--color-brand)]">▍</span>
                      ) : null}
                    </p>
                    {!step.isCorrect && !isPartialStep ? (
                      <p className="mt-2 text-xs text-[var(--color-error)]">
                        {getMisconceptionDisplay(step.misconceptionCode || "QE_WRONG_METHOD", "et").label}
                        {step.explanation ? ` · ${step.explanation}` : ""}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Sammude automaatne eraldamine ei õnnestunud piisava kindlusega.
            </p>
          )
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Ava sammud ainult siis, kui vajad detaili.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold">Harjutused</h2>
        {exercises.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Harjutused lisatakse pärast klastri uuendust.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {exercises.map((exercise) => (
              <article key={exercise.id} className="rounded-xl border border-[var(--color-border)] p-4">
                <Badge variant="neutral" className="uppercase">
                  {difficultyLabelEt[exercise.difficulty] || exercise.difficulty}
                </Badge>
                <p className="mt-2 text-sm font-medium">{exercise.promptEt || exercise.prompt}</p>
                {exercise.hint ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">Vihje: {exercise.hint}</p> : null}
                {exercise.solutionSteps.length > 0 ? (
                  <details className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)]">Sammud</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[var(--color-text-muted)]">
                      {exercise.solutionSteps.map((step, index) => (
                        <li key={`${exercise.id}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
