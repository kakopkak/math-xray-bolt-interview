"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SectionHeader } from "@/components/ui/section-header";
import { TrustTag } from "@/components/ui/trust-tag";
import type { AssignmentAnalytics } from "@/lib/assignment-analytics";
import { getMisconceptionDisplay } from "@/lib/misconception-labels";
import { formatRelativeTimeEt } from "@/lib/relative-time";
import {
  formatMasteryFraction,
  formatPriority,
  formatReasonPhrase,
  type TeacherTone,
} from "@/lib/teacher-copy";
import { getMisconceptionByCode } from "@/lib/taxonomy";

type Props = {
  assignmentId: string;
  assignmentTitle: string;
  initialAnalytics: AssignmentAnalytics;
  clusterHrefByCode: Record<string, string>;
};

type Severity = AssignmentAnalytics["misconceptionDistribution"][number]["severity"];

const toneBadgeVariant: Record<TeacherTone, "error" | "major" | "success" | "neutral"> = {
  critical: "error",
  warn: "major",
  ok: "success",
  muted: "neutral",
};

const severityBadgeVariant: Record<Severity, "minor" | "major" | "fundamental"> = {
  minor: "minor",
  major: "major",
  fundamental: "fundamental",
};

const severityWeight: Record<Severity, number> = {
  minor: 1,
  major: 2,
  fundamental: 3,
};

function buildStudentReason(student: AssignmentAnalytics["allStudents"][number]) {
  return formatReasonPhrase({
    divergenceCount: student.intelligence?.finalAnswerReasoningDivergence ? 1 : 0,
    recurringMisconceptionCount: 0,
    earlyBreakdownCount:
      student.intelligence?.firstWrongStep != null && student.intelligence.firstWrongStep <= 2 ? 1 : 0,
    topMisconceptionLabelEt: student.primaryMisconceptionLabelEt,
  });
}

function buildRelationBullet(
  relation: AssignmentAnalytics["classIntelligence"]["misconceptionRelations"][number],
  currentCode: string
) {
  const otherCode = relation.sourceCode === currentCode ? relation.targetCode : relation.sourceCode;
  const otherLabel = getMisconceptionDisplay(otherCode, "et").label;

  if (relation.kind === "co_occurs") {
    return `Sageli ilmub koos mustriga "${otherLabel}" (${relation.support} õpilast).`;
  }

  return `Enne seda tasub kinnistada "${otherLabel}" (${relation.support} õpilast).`;
}

export default function AnalyticsClient({
  assignmentId,
  assignmentTitle,
  initialAnalytics,
  clusterHrefByCode,
}: Props) {
  const [analytics, setAnalytics] = useState<AssignmentAnalytics>(initialAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllQueue, setShowAllQueue] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [selectedQueueSubmissionIds, setSelectedQueueSubmissionIds] = useState<string[]>([]);
  const [isApplyingBulkReview, setIsApplyingBulkReview] = useState(false);

  async function refreshAnalytics() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/analytics`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Analüütika laadimine ebaõnnestus.");
        return;
      }
      setAnalytics((await response.json()) as AssignmentAnalytics);
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      setError("Võrguviga analüütika laadimisel.");
    } finally {
      setIsLoading(false);
    }
  }

  const masteryCount =
    analytics.misconceptionDistribution.find((item) => item.code === "QE_NO_ERROR")?.count ?? 0;
  const reviewCount = analytics.classIntelligence.pulse.highPriorityReviewCount;
  const allMisconceptions = useMemo(
    () => analytics.misconceptionDistribution.filter((item) => item.code !== "QE_NO_ERROR"),
    [analytics.misconceptionDistribution]
  );
  const topCluster = useMemo(
    () =>
      allMisconceptions
        .slice()
        .sort(
          (left, right) =>
            right.count * severityWeight[right.severity] - left.count * severityWeight[left.severity] ||
            right.count - left.count ||
            left.labelEt.localeCompare(right.labelEt, "et")
        )[0] ?? null,
    [allMisconceptions]
  );
  const topClusterTaxonomy = topCluster ? getMisconceptionByCode(topCluster.code) : null;
  const masterySummary = formatMasteryFraction(masteryCount, analytics.totalStudents);
  const lowTrustCount = analytics.allStudents.filter((student) => student.dataQuality?.trustLevel === "low").length;
  const queueRows = useMemo(
    () =>
      analytics.classIntelligence.actionQueue.map((item) => ({
        ...item,
        student: analytics.allStudents.find((student) => student.submissionId === item.submissionId) ?? null,
        misconceptionLabel: getMisconceptionDisplay(item.primaryMisconception, "et").label,
      })),
    [analytics.allStudents, analytics.classIntelligence.actionQueue]
  );
  const displayedQueueRows = showAllQueue ? queueRows : queueRows.slice(0, 5);
  const queueSubmissionIds = queueRows.map((item) => item.submissionId);
  const hasSelectedQueueRows = selectedQueueSubmissionIds.length > 0;
  const isAllQueueSelected =
    queueSubmissionIds.length > 0 && queueSubmissionIds.every((id) => selectedQueueSubmissionIds.includes(id));
  const sortedStudents = useMemo(
    () =>
      analytics.allStudents
        .slice()
        .sort((left, right) => {
          const priorityDelta =
            (right.intelligence?.reviewPriorityScore ?? 0) - (left.intelligence?.reviewPriorityScore ?? 0);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          const createdAtDelta =
            new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
          if (createdAtDelta !== 0) {
            return createdAtDelta;
          }

          return left.name.localeCompare(right.name, "et");
        }),
    [analytics.allStudents]
  );
  const displayedStudents = showAllStudents ? sortedStudents : sortedStudents.slice(0, 10);
  const relationBulletsByCode = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const entry of allMisconceptions) {
      const relations = analytics.classIntelligence.misconceptionRelations
        .filter((relation) => relation.sourceCode === entry.code || relation.targetCode === entry.code)
        .sort((left, right) => right.support - left.support)
        .slice(0, 3)
        .map((relation) => buildRelationBullet(relation, entry.code));

      map.set(
        entry.code,
        relations.length > 0 ? relations : ["Seotud mustrit ei eristu. Vaata üksikuid lahendusi."]
      );
    }

    return map;
  }, [allMisconceptions, analytics.classIntelligence.misconceptionRelations]);
  const updatedAtSource =
    lastUpdatedAt ??
    analytics.allStudents.find((student) => student.createdAt)?.createdAt ??
    new Date().toISOString();


  async function applyBulkReview() {
    if (!hasSelectedQueueRows) {
      return;
    }

    setIsApplyingBulkReview(true);
    setError('');
    try {
      const response = await fetch('/api/submissions/bulk-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          submissionIds: selectedQueueSubmissionIds,
          override: {
            note: 'Bulk review: teacher confirmed queue items',
            overrideMisconceptionCode: null,
          },
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || 'Bulk review ebaõnnestus.');
        return;
      }
      setSelectedQueueSubmissionIds([]);
      await refreshAnalytics();
    } catch {
      setError('Võrguviga bulk review rakendamisel.');
    } finally {
      setIsApplyingBulkReview(false);
    }
  }
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Õpetaja", href: "/teacher" },
          { label: assignmentTitle, href: `/teacher/assignment/${assignmentId}` },
          { label: "Analüütika" },
        ]}
      />

      <SectionHeader
        title="Klassi analüütika"
        description="Tulemus, peamine takistus ja tagasisidet vajavad õpilased selles järjestuses."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refreshAnalytics()} disabled={isLoading}>
            {isLoading ? "Laen…" : "Värskenda"}
          </Button>
        }
      />

      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-brand)_22%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand)_14%,var(--color-surface))_0%,var(--color-surface)_54%,color-mix(in_oklab,var(--color-brand)_8%,var(--color-surface-raised))_100%)]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Klassi tulemus
          </p>
          <div className="space-y-2">
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
              {masteryCount}/{analytics.totalStudents} õpilast sai hakkama.
            </h2>
            <p className="text-base text-[var(--color-text-muted)]">
              Vajab silmi: {reviewCount}. Peamine takistus: {topCluster?.labelEt ?? "Üht peamist takistust ei eristunud"}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#review-queue"
              className="rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-foreground)]"
            >
              Ava järjekord
            </a>
            <a
              href="#primary-pattern"
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
            >
              Ava peamine muster
            </a>
            <Badge variant={toneBadgeVariant[masterySummary.tone]}>{masterySummary.label}</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Uuendatud {formatRelativeTimeEt(updatedAtSource)}.
          </p>
        </div>
      </Card>

      <section id="review-queue" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Kontrolli järjekord
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Keda vaadata enne järgmist sammu</h2>
          </div>
          {queueRows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (isAllQueueSelected) {
                    setSelectedQueueSubmissionIds([]);
                    return;
                  }
                  setSelectedQueueSubmissionIds(queueSubmissionIds);
                }}
              >
                {isAllQueueSelected ? "Tühjenda valik" : "Vali kõik"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!hasSelectedQueueRows || isApplyingBulkReview}
                onClick={() => void applyBulkReview()}
              >
                {isApplyingBulkReview ? "Rakendan…" : "Rakenda valikule"}
              </Button>
              {queueRows.length > 5 ? (
                <Button size="sm" variant="secondary" onClick={() => setShowAllQueue((current) => !current)}>
                  {showAllQueue ? "Näita vähem" : `Näita kõiki (${queueRows.length})`}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <Card>
          {displayedQueueRows.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Kõrge prioriteediga järjekorda praegu ei ole. Võid liikuda kohe peamise mustri juurde.
            </p>
          ) : (
            <div className="space-y-3">
              {displayedQueueRows.map((row) => {
                const priority = formatPriority(row.reviewPriorityScore, row.reviewPriority);

                return (
                  <div
                    key={row.submissionId}
                    className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3 ${
                      selectedQueueSubmissionIds.includes(row.submissionId)
                        ? "border-[color-mix(in_oklab,var(--color-brand)_50%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-brand)_8%,var(--color-surface))]"
                        : "border-[var(--color-border)]"
                    }`}
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/student/result/${row.submissionId}`}
                        className="font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
                      >
                        {row.studentName}
                      </Link>
                      <p className="text-sm text-[var(--color-text-muted)]">{row.misconceptionLabel}</p>
                      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <input
                          type="checkbox"
                          checked={selectedQueueSubmissionIds.includes(row.submissionId)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedQueueSubmissionIds((current) => [...new Set([...current, row.submissionId])]);
                              return;
                            }
                            setSelectedQueueSubmissionIds((current) =>
                              current.filter((submissionId) => submissionId !== row.submissionId)
                            );
                          }}
                        />
                        Märgi
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={toneBadgeVariant[priority.tone]}
                        title={priority.tooltip}
                        aria-label={priority.tooltip ?? priority.label}
                      >
                        {priority.label}
                      </Badge>
                      <TrustTag
                        level={row.student?.dataQuality?.trustLevel}
                        extractionSource={row.student?.analysisMeta?.extractionSource}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section id="primary-pattern" className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Peamine muster
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Milline viga hoiab klassi kinni</h2>
        </div>
        <Card>
          {topCluster ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityBadgeVariant[topCluster.severity]}>{topCluster.labelEt}</Badge>
                    <Badge variant="neutral">
                      {topCluster.count}/{analytics.completedCount || analytics.totalStudents} lahenduses
                    </Badge>
                  </div>
                  <p className="max-w-3xl text-base text-[var(--color-text)]">
                    {topClusterTaxonomy?.descriptionEt ?? "Selles mustris kordub sama takistus mitmes lahenduses."}
                  </p>
                  <p className="max-w-3xl text-sm text-[var(--color-text-muted)]">
                    {topClusterTaxonomy?.correctApproach
                      ? `Õige fookus: ${topClusterTaxonomy.correctApproach}`
                      : "Ava seotud klaster ja vaata näidislahendusi enne järgmise töö andmist."}
                  </p>
                </div>
                {clusterHrefByCode[topCluster.code] ? (
                  <Link
                    href={clusterHrefByCode[topCluster.code]}
                    className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  >
                    Ava klaster →
                  </Link>
                ) : (
                  <a
                    href="#all-misconceptions"
                    className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  >
                    Ava klaster →
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Valmis analüüse on veel vähe. Kui lahendusi lisandub, ilmub siia klassi peamine muster.
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Õpilased
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Kes vajab tagasisidet või kinnitust</h2>
          </div>
          {sortedStudents.length > 10 ? (
            <Button size="sm" variant="secondary" onClick={() => setShowAllStudents((current) => !current)}>
              {showAllStudents ? "Näita vähem" : `Näita kõiki (${sortedStudents.length})`}
            </Button>
          ) : null}
        </div>
        <Card>
          <ResponsiveTable
            className="mt-1"
            ariaLabel="Õpilaste analüütika tabel"
            rows={displayedStudents}
            getRowId={(row) => row.submissionId}
            columns={[
              {
                key: "student",
                header: "Õpilane",
                mobileLabel: "Õpilane",
                cell: (row) => <p className="font-medium">{row.name}</p>,
              },
              {
                key: "reason",
                header: "Mida näitas viimati",
                mobileLabel: "Viimane muster",
                cell: (row) => buildStudentReason(row),
              },
              {
                key: "answered",
                header: "Viimati vastas",
                mobileLabel: "Viimati",
                cell: (row) => (row.createdAt ? formatRelativeTimeEt(row.createdAt) : "—"),
              },
              {
                key: "trust",
                header: "Usaldus",
                mobileLabel: "Usaldus",
                cell: (row) => (
                  <TrustTag level={row.dataQuality?.trustLevel} extractionSource={row.analysisMeta?.extractionSource} />
                ),
              },
              {
                key: "action",
                header: "Ava",
                mobileLabel: "Ava",
                cell: (row) => (
                  <Link
                    href={`/student/result/${row.submissionId}`}
                    className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                  >
                    Ava
                  </Link>
                ),
              },
            ]}
            emptyStateTitle="Õpilaste nimekiri on tühi"
            emptyStateDescription="Selle ülesande kohta pole veel analüüsitavaid lahendusi."
          />
        </Card>
      </section>

      <details
        id="all-misconceptions"
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-[var(--color-text)]">
          <span>Kõik väärarusaamad</span>
          <span className="text-[var(--color-text-muted)]">Tulpdiagramm ja seotud mustrid</span>
        </summary>
        <div className="space-y-5 border-t border-[var(--color-border)] px-5 py-5">
          <Card>
            <h3 className="text-xl font-semibold">Mustrid üle terve töö</h3>
            {allMisconceptions.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Valmis analüüse pole veel piisavalt.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <BarChart
                  width={Math.max(680, allMisconceptions.length * 120)}
                  height={320}
                  data={allMisconceptions}
                  margin={{ left: 24, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="labelEt" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={84} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} õpilast`, "Kordub"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {allMisconceptions.map((entry) => (
                      <Cell
                        key={entry.code}
                        fill={
                          entry.severity === "fundamental"
                            ? "var(--color-error)"
                            : entry.severity === "major"
                              ? "var(--color-warning)"
                              : "var(--color-brand)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            )}
          </Card>

          <div className="grid gap-3">
            {allMisconceptions.map((misconception) => (
              <Card key={misconception.code}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[var(--color-text)]">{misconception.labelEt}</p>
                      <Badge variant={severityBadgeVariant[misconception.severity]}>
                        {misconception.count} õpilast
                      </Badge>
                    </div>
                    <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
                      {(relationBulletsByCode.get(misconception.code) ?? []).map((bullet) => (
                        <li key={`${misconception.code}-${bullet}`}>• {bullet}</li>
                      ))}
                    </ul>
                  </div>
                  {clusterHrefByCode[misconception.code] ? (
                    <Link
                      href={clusterHrefByCode[misconception.code]}
                      className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                    >
                      Ava klaster →
                    </Link>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </details>

      <p className="text-sm text-[var(--color-text-muted)]">
        Tänane andmestik: {analytics.totalStudents} õpilast · {lowTrustCount} vajavad ülekontrollimist · Uuendatud{" "}
        {formatRelativeTimeEt(updatedAtSource)}.
      </p>
    </div>
  );
}
