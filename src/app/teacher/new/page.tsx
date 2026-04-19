"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button, buttonClassName } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SectionHeader } from "@/components/ui/section-header";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TextArea, TextInput } from "@/components/ui/input";
import type { CreateAssignmentRequest } from "@/lib/schemas";
import { TOPIC_CATALOG, type AssignmentTopic } from "@/lib/taxonomy";

export default function NewAssignmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<AssignmentTopic>("quadratic_equations");
  const [gradeLevel, setGradeLevel] = useState(9);
  const [classLabel, setClassLabel] = useState("9A");
  const [description, setDescription] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload: CreateAssignmentRequest = {
        title,
        gradeLevel,
        classLabel,
        description,
        answerKey,
        topic,
        organizationKey: "",
        teacherId: "",
        curriculumOutcomes: [],
      };
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || "Ülesande loomine ebaõnnestus.");
        return;
      }

      const assignment = (await response.json()) as { _id: string };
      router.push(`/teacher/assignment/${assignment._id}`);
    } catch {
      setError("Võrguviga ülesande loomisel.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Õpetaja", href: "/teacher" },
          { label: "Uus ülesanne" },
        ]}
      />
      <SectionHeader
        title="Loo uus ülesanne"
        description="Pealkiri, teema, klass, ülesanne, vastus."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--color-text)]">Pealkiri</span>
            <TextInput
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ruutvõrrandid — Kontrolltöö"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--color-text)]">Teema</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value as AssignmentTopic)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)]"
            >
              {TOPIC_CATALOG.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.labelEt}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--color-text)]">Klass</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput
                type="number"
                min={1}
                max={12}
                value={gradeLevel}
                onChange={(event) => setGradeLevel(Number(event.target.value))}
              />
              <TextInput
                value={classLabel}
                onChange={(event) => setClassLabel(event.target.value)}
                placeholder="9A"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--color-text)]">Kirjeldus</span>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28"
              placeholder="Lahenda ruutvõrrandid ja näita sammud."
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--color-text)]">Vastuse võti</span>
            <TextArea
              value={answerKey}
              onChange={(event) => setAnswerKey(event.target.value)}
              className="min-h-40"
              placeholder="x² + 5x + 6 = 0 -> (x+2)(x+3)=0 -> x=-2, x=-3"
            />
          </label>

          {error && <FeedbackBanner tone="error" message={error} />}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Loon…" : "Loo ülesanne"}
            </Button>
            <Link
              href="/teacher"
              className={buttonClassName({ variant: "secondary" })}
            >
              Tagasi
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
