"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SectionHeader } from "@/components/ui/section-header";
import { TrustTag } from "@/components/ui/trust-tag";
import { formatRelativeTimeEt } from "@/lib/relative-time";
import {
  formatMasteryFraction,
  formatPressure,
  formatReasonPhrase,
  formatTrend,
  type TeacherTone,
} from "@/lib/teacher-copy";
import type { AssignmentTopic } from "@/lib/taxonomy";
import type { SuperDashboardResponse } from "@/lib/super-dashboard/types";

type AssignmentListItem = {
  _id: string;
  title: string;
  gradeLevel: number;
  classLabel?: string;
  description: string;
  submissionCount: number;
  status: "draft" | "active" | "analyzed";
  topic: AssignmentTopic;
};

type Props = {
  initialDashboard: SuperDashboardResponse;
  initialAssignments: AssignmentListItem[];
};

type FilterState = {
  classKey: string;
  assignmentId: string;
  topic: string;
  studentKey: string;
  misconceptionCode: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
};

const toneBadgeVariant: Record<TeacherTone, "error" | "major" | "success" | "neutral"> = {
  critical: "error",
  warn: "major",
  ok: "success",
  muted: "neutral",
};

function topicLabelEt(topic: AssignmentTopic): string {
  if (topic === "linear_equations") return "Lineaarvõrrandid";
  if (topic === "fractions") return "Murrud";
  return "Ruutvõrrandid";
}

function severityLabelEt(severity: "minor" | "major" | "fundamental"): string {
  if (severity === "fundamental") return "Sügav takistus";
  if (severity === "major") return "Oluline takistus";
  return "Jälgi";
}

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.classKey) params.set("classKey", filters.classKey);
  if (filters.assignmentId) params.set("assignmentId", filters.assignmentId);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.studentKey) params.set("studentKey", filters.studentKey);
  if (filters.misconceptionCode) params.set("misconceptionCode", filters.misconceptionCode);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params.toString();
}

function toStudentTrend(trend: "improving" | "stable" | "worsening") {
  if (trend === "improving") {
    return formatTrend(1, false);
  }
  if (trend === "worsening") {
    return formatTrend(-1, false);
  }
  return formatTrend(0, false);
}

export default function SuperDashboardClient({ initialDashboard, initialAssignments }: Props) {
  const [dashboard, setDashboard] = useState<SuperDashboardResponse>(initialDashboard);
  const [filters, setFilters] = useState<FilterState>({
    classKey: initialDashboard.meta.filters.classKey || "",
    assignmentId: initialDashboard.meta.filters.assignmentId || "",
    topic: initialDashboard.meta.filters.topic || "",
    studentKey: initialDashboard.meta.filters.studentKey || "",
    misconceptionCode: initialDashboard.meta.filters.misconceptionCode || "",
    severity: initialDashboard.meta.filters.severity || "",
    dateFrom: initialDashboard.meta.filters.dateFrom?.slice(0, 10) || "",
    dateTo: initialDashboard.meta.filters.dateTo?.slice(0, 10) || "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [curriculumReport, setCurriculumReport] = useState<Array<{
    topic: string;
    totalSubmissions: number;
    masteryRate: number;
    topMisconceptions: Array<{ code: string; count: number }>;
  }> | null>(null);

  const topMisconception =
    dashboard.misconceptionOverview[0] || dashboard.overview.topMisconceptions[0] || null;
  const urgentStudents = dashboard.studentsAtRisk
    .filter((student) => student.highPriorityUnreviewedCount > 0 || student.riskScore >= 65)
    .slice(0, 3);
  const displayedStudents = showAllStudents
    ? dashboard.studentsAtRisk
    : dashboard.studentsAtRisk.slice(0, 10);
  const recentAssignments = [...dashboard.assignmentWeakPoints]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const sparklineData = dashboard.trendSeries.slice(-6).map((point) => ({
    bucket: point.bucket,
    count:
      dashboard.misconceptionOverview.find((misconception) => misconception.code === topMisconception?.code)?.count ??
      point.highRiskCount,
  }));

  async function refreshDashboard(nextFilters: FilterState = filters) {
    setIsRefreshing(true);
    setError("");
    try {
      const query = buildQuery(nextFilters);
      const response = await fetch(`/api/teacher/super-dashboard${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Ülevaate laadimine ebaõnnestus.");
        return;
      }
      setDashboard((await response.json()) as SuperDashboardResponse);
    } catch {
      setError("Võrguviga ülevaate laadimisel.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function applyFilterPatch(patch: Partial<FilterState>) {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    await refreshDashboard(nextFilters);
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadCurriculumReport() {
      try {
        const response = await fetch("/api/teacher/curriculum-report", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          curriculum?: Array<{
            topic: string;
            totalSubmissions: number;
            masteryRate: number;
            topMisconceptions: Array<{ code: string; count: number }>;
          }>;
        };
        if (!response.ok || !payload.curriculum || isCancelled) {
          return;
        }
        setCurriculumReport(payload.curriculum);
      } catch {
        // Keep dashboard visible if curriculum report fetch fails.
      }
    }

    void loadCurriculumReport();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Õpetaja supertöölaud"
        description="Hommikuvaade, mis näitab kohe, keda aidata, mis muster kordub ja kuhu tasub tunnis fookus panna."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void refreshDashboard()} disabled={isRefreshing}>
              {isRefreshing ? "Laen…" : "Värskenda"}
            </Button>
            <Link
              href="/teacher/new"
              className="rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-foreground)]"
            >
              Uus ülesanne
            </Link>
            <a
              href={`/api/teacher/super-dashboard/export?${buildQuery(filters)}`}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
            >
              Ekspordi CSV
            </a>
          </div>
        }
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Klass"
            value={filters.classKey}
            onChange={(value) => setFilters((current) => ({ ...current, classKey: value }))}
            options={[
              { value: "", label: "Kõik klassid" },
              ...dashboard.filterOptions.classes.map((entry) => ({
                value: entry.classKey,
                label: `${entry.classLabel} (${entry.count})`,
              })),
            ]}
          />
          <FilterSelect
            label="Ülesanne"
            value={filters.assignmentId}
            onChange={(value) => setFilters((current) => ({ ...current, assignmentId: value }))}
            options={[
              { value: "", label: "Kõik ülesanded" },
              ...dashboard.filterOptions.assignments.map((entry) => ({
                value: entry.assignmentId,
                label: entry.title,
              })),
            ]}
          />
          <FilterInput
            label="Alates"
            type="date"
            value={filters.dateFrom}
            onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))}
          />
          <FilterInput
            label="Kuni"
            type="date"
            value={filters.dateTo}
            onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void refreshDashboard()} disabled={isRefreshing}>
            Rakenda filtrid
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const nextFilters = {
                classKey: "",
                assignmentId: "",
                topic: "",
                studentKey: "",
                misconceptionCode: "",
                severity: "",
                dateFrom: "",
                dateTo: "",
              };
              setFilters(nextFilters);
              void refreshDashboard(nextFilters);
            }}
          >
            Tühjenda
          </Button>
        </div>
      </Card>

      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <Card className="overflow-hidden border-[color-mix(in_oklab,var(--color-brand)_24%,var(--color-border))] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-brand)_14%,var(--color-surface))_0%,var(--color-surface)_58%,color-mix(in_oklab,var(--color-success)_6%,var(--color-surface-raised))_100%)]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Hommikune skänn
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">
              {dashboard.overview.unresolvedHighRiskCount} õpilast vajavad täna tähelepanu.
            </h2>
            <p className="text-base text-[var(--color-text-muted)]">
              Peamine takistus: {topMisconception?.labelEt || "Ühte läbivat takistust pole"}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#students"
              className="rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-foreground)]"
            >
              Vaata õpilasi
            </a>
            <a
              href="#misconceptions"
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
            >
              Ava muster
            </a>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Uuendatud {formatRelativeTimeEt(dashboard.meta.generatedAt)}.
          </p>
        </div>
      </Card>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Mida täna teha
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Alusta siit</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">Kiireloomuline</h3>
              <Badge variant="error">{urgentStudents.length}</Badge>
            </div>
            {urgentStudents.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Täna kedagi uut pole järjekorras. Hea töö!
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {urgentStudents.map((student) => (
                  <div key={student.studentKey} className="rounded-xl border border-[var(--color-border)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">{student.studentName}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">{student.classLabel}</p>
                      </div>
                      {student.latestSubmissionId ? (
                        <Link
                          href={`/student/result/${student.latestSubmissionId}`}
                          className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                        >
                          Ava →
                        </Link>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                      {formatReasonPhrase(student)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">Klassi muster</h3>
              {topMisconception ? (
                <Badge variant={topMisconception.severity === "fundamental" ? "error" : "major"}>
                  {severityLabelEt(topMisconception.severity)}
                </Badge>
              ) : null}
            </div>
            {topMisconception ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--color-text)]">{topMisconception.labelEt}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {topMisconception.count} korda · {topMisconception.studentCount} õpilast
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  {sparklineData.map((point) => (
                    <div key={point.bucket} className="flex-1">
                      <div
                        className="rounded-t-md bg-[color-mix(in_oklab,var(--color-brand)_70%,var(--color-surface))]"
                        style={{
                          height: `${Math.max(
                            16,
                            (point.count / Math.max(1, ...sparklineData.map((entry) => entry.count))) * 56
                          )}px`,
                        }}
                        title={`${point.bucket}: ${point.count}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  See muster kordub klassi viimastes lahendustes ja vajab ühte lühikest ühist parandussammu enne uut ülesannet.
                </p>
                <Button size="sm" variant="secondary" onClick={() => void applyFilterPatch({ misconceptionCode: topMisconception.code })}>
                  Ava muster →
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Praegu ei ole ühte domineerivat väärarusaama, mis vajaks eraldi fookust.
              </p>
            )}
          </Card>
        </div>
      </section>

      <section id="students" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Õpilased
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Kes vajab praegu õpetaja pilku</h2>
          </div>
          {dashboard.studentsAtRisk.length > 10 ? (
            <Button size="sm" variant="secondary" onClick={() => setShowAllStudents((current) => !current)}>
              {showAllStudents ? "Näita vähem" : `Näita kõiki (${dashboard.studentsAtRisk.length})`}
            </Button>
          ) : null}
        </div>
        <Card>
          <ResponsiveTable
            className="mt-1"
            ariaLabel="Õpilaste tähelepanu tabel"
            rows={displayedStudents}
            getRowId={(row) => row.studentKey}
            columns={[
              {
                key: "student",
                header: "Õpilane",
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{row.classLabel}</p>
                  </div>
                ),
              },
              {
                key: "reason",
                header: "Mida näitas viimati",
                cell: (row) => formatReasonPhrase(row),
              },
              {
                key: "trend",
                header: "Muutus",
                cell: (row) => {
                  const trend = toStudentTrend(row.trend);

                  return (
                    <Badge variant={toneBadgeVariant[trend.tone]} title={trend.description}>
                      {trend.glyph} {trend.label}
                    </Badge>
                  );
                },
              },
              {
                key: "trust",
                header: "Usaldus",
                cell: (row) => (
                  <TrustTag level={row.trustLevel} extractionSource={row.extractionSource} />
                ),
              },
              {
                key: "action",
                header: "Ava",
                cell: (row) =>
                  row.latestSubmissionId ? (
                    <Link
                      href={`/student/result/${row.latestSubmissionId}`}
                      className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                    >
                      Ava
                    </Link>
                  ) : (
                    "—"
                  ),
              },
            ]}
            emptyStateTitle="Tähelepanu vajavate õpilaste tabel on tühi"
            emptyStateDescription="Praegu pole nende filtritega õpilasi, kes vajaksid kiiret sekkumist."
          />
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Teemad
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Milline teema vajab järgmises tunnis fookust</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {dashboard.topicOverview.slice(0, 4).map((topic) => {
            const trend = formatTrend(topic.trendDelta, false);
            const mastery = formatMasteryFraction(
              Math.round((topic.masteryScore / 100) * topic.completedCount),
              topic.completedCount
            );
            const isActive = filters.topic === topic.topic;

            return (
              <button
                key={topic.topic}
                type="button"
                onClick={() => void applyFilterPatch({ topic: filters.topic === topic.topic ? "" : topic.topic })}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-[color-mix(in_oklab,var(--color-brand)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-brand)_8%,var(--color-surface-raised))]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]"
                }`}
              >
                <p className="font-semibold text-[var(--color-text)]">{topic.labelEt}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{mastery.label}</p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]" title={trend.description}>
                  {trend.glyph} {trend.label}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section id="misconceptions" className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Väärarusaamad
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Korduvad takistused üle klasside</h2>
        </div>
        <div className="grid gap-3">
          {dashboard.misconceptionOverview.slice(0, 5).map((misconception) => {
            const trend = formatTrend(misconception.trendDelta, true);

            return (
              <Card key={misconception.code}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[var(--color-text)]">{misconception.labelEt}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {misconception.count} korda · {misconception.studentCount} õpilast
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={misconception.severity === "fundamental" ? "error" : "major"}>
                      {severityLabelEt(misconception.severity)}
                    </Badge>
                    <Badge variant={toneBadgeVariant[trend.tone]} title={trend.description}>
                      {trend.glyph} {trend.label}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => void applyFilterPatch({ misconceptionCode: misconception.code })}>
                      Ava →
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Ülesanded
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Hiljutised tööd, mis väärivad pilku</h2>
        </div>
        <div className="grid gap-3">
          {recentAssignments.map((assignment) => {
            const mastery = formatMasteryFraction(
              Math.round(((100 - assignment.gapRate) / 100) * assignment.submissionCount),
              assignment.submissionCount
            );
            const obstacleTone = formatPressure(assignment.pressureScore);

            return (
              <Card key={assignment.assignmentId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[var(--color-text)]">{assignment.assignmentTitle}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {assignment.classLabel} · {topicLabelEt(assignment.topic)}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {mastery.label} · {formatRelativeTimeEt(assignment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={toneBadgeVariant[obstacleTone.tone]}>{obstacleTone.label}</Badge>
                    <Link
                      href={`/teacher/assignment/${assignment.assignmentId}`}
                      className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                    >
                      Ava →
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
          {recentAssignments.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">
                {initialAssignments.length > 0
                  ? "Sobivaid ülesandeid ei leitud nende filtritega. Proovi teist vaadet."
                  : "Sobivaid ülesandeid ei leitud. Kontrolli filtreid või lisa uus ülesanne."}
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-[var(--color-text)]">
          <span>Süvaanalüüs</span>
          <span className="text-[var(--color-text-muted)]">
            Trend, kuumkaart, mõju, andmekvaliteet ja lisafiltrid
          </span>
        </summary>
        <div className="space-y-6 border-t border-[var(--color-border)] px-5 py-5">
          <div>
            <h3 className="text-xl font-semibold">Kõik filtrid</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Süvavaates saad kitsendada pilti teema, õpilase, väärarusaama ja tõsiduse järgi.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Teema"
              value={filters.topic}
              onChange={(value) => setFilters((current) => ({ ...current, topic: value }))}
              options={[
                { value: "", label: "Kõik teemad" },
                ...dashboard.filterOptions.topics.map((entry) => ({
                  value: entry.topic,
                  label: `${entry.labelEt} (${entry.count})`,
                })),
              ]}
            />
            <FilterSelect
              label="Väärarusaam"
              value={filters.misconceptionCode}
              onChange={(value) => setFilters((current) => ({ ...current, misconceptionCode: value }))}
              options={[
                { value: "", label: "Kõik väärarusaamad" },
                ...dashboard.filterOptions.misconceptions.map((entry) => ({
                  value: entry.code,
                  label: `${entry.labelEt} (${entry.count})`,
                })),
              ]}
            />
            <FilterSelect
              label="Õpilane"
              value={filters.studentKey}
              onChange={(value) => setFilters((current) => ({ ...current, studentKey: value }))}
              options={[
                { value: "", label: "Kõik õpilased" },
                ...dashboard.filterOptions.students.map((entry) => ({
                  value: entry.studentKey,
                  label: `${entry.studentName} (${entry.submissionCount})`,
                })),
              ]}
            />
            <FilterSelect
              label="Tõsidus"
              value={filters.severity}
              onChange={(value) => setFilters((current) => ({ ...current, severity: value }))}
              options={[
                { value: "", label: "Kõik tõsidused" },
                ...dashboard.filterOptions.severities.map((entry) => ({
                  value: entry,
                  label: severityLabelEt(entry),
                })),
              ]}
            />
          </div>

          <Card>
            <h3 className="text-xl font-semibold">Trend ajas</h3>
            {dashboard.trendSeries.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Ajalise võrdluse jaoks on vaja rohkem andmeid.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <BarChart width={Math.max(680, dashboard.trendSeries.length * 120)} height={280} data={dashboard.trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "masteryRate") return [`${value}%`, "Sai hakkama"];
                      return [value, "Vajab pilku"];
                    }}
                  />
                  <Bar dataKey="masteryRate" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="highRiskCount" fill="var(--color-warning)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-xl font-semibold">Lõhe kuumkaart</h3>
            {dashboard.gapHeatmap.cells.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Hetkel pole piisavalt korduvaid lõhesid.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                      <th className="px-2 py-2">Õpilane</th>
                      {dashboard.gapHeatmap.misconceptions.map((misconception) => (
                        <th key={misconception.code} className="px-2 py-2">
                          {misconception.labelEt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.gapHeatmap.students.map((student) => (
                      <tr key={student.studentKey} className="border-b border-[var(--color-border)]">
                        <td className="px-2 py-2 font-medium">{student.studentName}</td>
                        {dashboard.gapHeatmap.misconceptions.map((misconception) => {
                          const cell = dashboard.gapHeatmap.cells.find(
                            (entry) =>
                              entry.studentKey === student.studentKey &&
                              entry.misconceptionCode === misconception.code
                          );
                          const intensity = Math.min(1, (cell?.risk || 0) / 100);

                          return (
                            <td key={`${student.studentKey}-${misconception.code}`} className="px-2 py-2">
                              <div
                                className="h-8 rounded-md"
                                title={
                                  cell && cell.count > 0
                                    ? `${cell.count} kordust · vajab tähelepanu`
                                    : "Selles lahtris kordust ei ole"
                                }
                                aria-label={
                                  cell && cell.count > 0
                                    ? `${cell.count} kordust · vajab tähelepanu`
                                    : "Selles lahtris kordust ei ole"
                                }
                                style={{
                                  backgroundColor:
                                    cell && cell.count > 0
                                      ? `color-mix(in oklab, var(--color-error) ${Math.max(
                                          15,
                                          intensity * 70
                                        )}%, var(--color-surface))`
                                      : "var(--color-surface-raised)",
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <h3 className="text-xl font-semibold">Sekkumise mõju</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <StatMini label="Jälgitud" value={dashboard.interventionImpact.trackedCount} />
                <StatMini label="Paranenud" value={dashboard.interventionImpact.improvedCount} />
                <StatMini label="Muutumatu" value={dashboard.interventionImpact.unchangedCount} />
                <StatMini label="Halvenenud" value={dashboard.interventionImpact.worsenedCount} />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.interventionImpact.byType.map((item) => (
                  <div
                    key={item.interventionType}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  >
                    <span>{item.interventionType}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {item.count} · {item.improvedShare}% paranes
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-xl font-semibold">Andmekvaliteet</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <StatMini label="Usaldusväärne" value={dashboard.dataQuality.trustLevelDistribution.high} />
                <StatMini label="Osaliselt usaldatav" value={dashboard.dataQuality.trustLevelDistribution.medium} />
                <StatMini label="Kontrolli üle" value={dashboard.dataQuality.trustLevelDistribution.low} />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.dataQuality.topReasons.map((reason) => (
                  <div
                    key={reason.reason}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  >
                    <span>{reason.reason}</span>
                    <Badge variant="neutral">{reason.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </details>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Õppekava kaetus</h2>
          <a
            href="/api/teacher/curriculum-report"
            className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
          >
            Ekspordi CSV
          </a>
        </div>
        {!curriculumReport || curriculumReport.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">Õppekava kaetuse andmed puuduvad.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {curriculumReport.map((entry) => (
              <Card key={entry.topic}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text)]">{topicLabelEt(entry.topic as AssignmentTopic)}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Katvus: {Math.round(entry.masteryRate * 100)}%</p>
                  </div>
                  <Badge variant="neutral">{entry.totalSubmissions}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-[var(--color-text-muted)]">
        Tänane andmestik: {dashboard.overview.studentCount} õpilast · {dashboard.dataQuality.lowTrustStudentCount} vajavad
        {" "}ülekontrollimist · Uuendatud {formatRelativeTimeEt(dashboard.meta.generatedAt)}.
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[var(--color-text)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[var(--color-text)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
      />
    </label>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
