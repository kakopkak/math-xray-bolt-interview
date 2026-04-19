"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type Props = {
  assignmentId: string;
};

type LivePulsePayload = {
  assignmentId: string;
  pulse: {
    total: number;
    activeCount: number;
    avatars: Array<{
      id: string;
      anonymousName: string;
      status: string;
    }>;
  };
};

const statusLabel: Record<string, string> = {
  pending: "Järjekorras",
  extracting: "Töötlen samme",
  classifying: "Tuvastan mustrit",
  needs_manual_review: "Vajab õpetaja pilku",
  complete: "Valmis",
  error: "Viga",
};

export default function LiveClient({ assignmentId }: Props) {
  const [payload, setPayload] = useState<LivePulsePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;
    let timerId: number | null = null;

    async function loadPulse() {
      try {
        const response = await fetch(`/api/teacher/assignment/${assignmentId}/live-pulse`, {
          cache: "no-store",
        });
        const nextPayload = (await response.json().catch(() => ({}))) as
          | LivePulsePayload
          | { error?: string };
        if (!response.ok) {
          const payloadError =
            typeof nextPayload === "object" && nextPayload && "error" in nextPayload
              ? nextPayload.error
              : undefined;
          if (!isCancelled) {
            setError(payloadError || "Live vaate laadimine ebaõnnestus.");
          }
          return;
        }
        if (!isCancelled) {
          setPayload(nextPayload as LivePulsePayload);
          setError("");
        }
      } catch {
        if (!isCancelled) {
          setError("Live vaate laadimine ebaõnnestus.");
        }
      } finally {
        if (!isCancelled) {
          timerId = window.setTimeout(() => {
            void loadPulse();
          }, 4000);
        }
      }
    }

    void loadPulse();

    return () => {
      isCancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [assignmentId]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card>
        <h1 className="text-3xl font-semibold tracking-tight">Live session</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Õpilaste nimed on peidetud. Vaade sobib klassi ekraanile.
        </p>
      </Card>

      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      {!payload ? (
        <FeedbackBanner tone="info" message="Laen live-pulssi…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">Aktiivsed</p>
              <p className="mt-1 text-4xl font-semibold">{payload.pulse.activeCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">Kokku esitusi</p>
              <p className="mt-1 text-4xl font-semibold">{payload.pulse.total}</p>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {payload.pulse.avatars.map((avatar) => (
              <Card key={avatar.id}>
                <p className="text-lg font-semibold">{avatar.anonymousName}</p>
                <Badge className="mt-2" variant="neutral">
                  {statusLabel[avatar.status] || avatar.status}
                </Badge>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}