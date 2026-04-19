"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TextArea, TextInput } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SectionHeader } from "@/components/ui/section-header";
import FileUpload from "@/components/file-upload";
import {
  getSubmitValidationMessage,
  hasSubmitValidationErrors,
  type SubmitValidationErrors,
  validateSubmitInput,
} from "./submit-validation";
import type { SubmissionInputRequest, SubmissionInputType } from "@/lib/schemas";

type Props = {
  assignmentId: string;
  assignment: {
    title: string;
    description?: string;
    gradeLevel: number;
    classLabel?: string;
  };
};

export default function SubmitClient({ assignmentId, assignment }: Props) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [inputType, setInputType] = useState<SubmissionInputType>("typed");
  const [typedSolution, setTypedSolution] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SubmitValidationErrors>({});

  function clearFieldError(field: keyof SubmitValidationErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateSubmitInput({
      studentName,
      inputType,
      typedSolution,
      photoBase64,
      voiceAudioBase64: "",
      voiceMimeType: "",
    });

    if (hasSubmitValidationErrors(validationErrors)) {
      setFieldErrors(validationErrors);
      setError(getSubmitValidationMessage(validationErrors));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const rawContent = inputType === "typed" ? typedSolution.trim() : photoBase64.trim();
      const payload: SubmissionInputRequest = {
        studentName: studentName.trim(),
        inputType,
        rawContent,
        typedSolution: "",
        photoBase64: "",
        voiceAudioBase64: "",
        voiceMimeType: "",
      };
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          fieldErrors?: SubmitValidationErrors;
        };
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setError(payload.error || "Lahenduse saatmine ebaõnnestus.");
        return;
      }

      const submission = (await response.json()) as { _id: string };
      router.push(`/student/result/${submission._id}`);
    } catch {
      setError("Võrguviga lahenduse saatmisel.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Matemaatika Röntgen", href: "/" },
          { label: "Õpilase esitamine" },
        ]}
      />

      <Card>
        <SectionHeader
          title={assignment.title}
          description={
            <span>
              <span className="block">Klass {assignment.gradeLevel}</span>
              {assignment.classLabel ? (
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Rühm {assignment.classLabel}</span>
              ) : null}
              {assignment.description ? (
                <span className="mt-2 block text-[var(--color-text)]">{assignment.description}</span>
              ) : null}
            </span>
          }
        />
      </Card>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-text)]">Õpilase nimi</span>
            <TextInput
              value={studentName}
              onChange={(event) => {
                setStudentName(event.target.value);
                clearFieldError("studentName");
              }}
              invalid={Boolean(fieldErrors.studentName)}
              aria-invalid={Boolean(fieldErrors.studentName)}
              aria-describedby={fieldErrors.studentName ? "student-name-error" : undefined}
              placeholder="Mari Maasikas"
            />
            {fieldErrors.studentName && (
              <p id="student-name-error" className="text-sm text-[var(--color-error)]">
                {fieldErrors.studentName}
              </p>
            )}
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[var(--color-text)]">Sisendi tüüp</legend>
            <SegmentedControl
              ariaLabel="Sisendi tüüp"
              value={inputType}
              onChange={(nextValue) => {
                setInputType(nextValue);
                setError("");
                setFieldErrors({});
              }}
              options={[
                { value: "typed", label: "Tekst" },
                { value: "photo", label: "Foto" },
              ]}
            />
          </fieldset>

          {inputType === "typed" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Lahenduskäik</span>
              <TextArea
                value={typedSolution}
                onChange={(event) => {
                  setTypedSolution(event.target.value);
                  clearFieldError("typedSolution");
                }}
                invalid={Boolean(fieldErrors.typedSolution)}
                className="min-h-44"
                aria-invalid={Boolean(fieldErrors.typedSolution)}
                aria-describedby={fieldErrors.typedSolution ? "typed-solution-error" : undefined}
                placeholder="Kirjuta sammud..."
              />
              {fieldErrors.typedSolution && (
                <p id="typed-solution-error" className="text-sm text-[var(--color-error)]">
                  {fieldErrors.typedSolution}
                </p>
              )}
            </label>
          ) : (
            <div className="space-y-2">
              <FileUpload
                value={photoBase64}
                onChange={(value) => {
                  setPhotoBase64(value);
                  clearFieldError("photoBase64");
                }}
                disabled={isSubmitting}
              />
              {fieldErrors.photoBase64 && (
                <p className="text-sm text-[var(--color-error)]">{fieldErrors.photoBase64}</p>
              )}
            </div>
          )}

          {error && <FeedbackBanner tone="error" message={error} />}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saadan…" : "Saada"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
