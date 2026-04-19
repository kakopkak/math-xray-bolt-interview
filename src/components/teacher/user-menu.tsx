"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TeacherUserMenu({ className = "" }: { className?: string }) {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (status === "loading") {
    return (
      <div
        className={`inline-flex min-w-56 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)] ${className}`.trim()}
      >
        <div className="size-10 animate-pulse rounded-full bg-[var(--color-surface-raised)]" />
        <div className="space-y-1">
          <div className="h-3.5 w-28 animate-pulse rounded-full bg-[var(--color-surface-raised)]" />
          <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--color-surface-raised)]" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <div
        className={`inline-flex items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)] ${className}`.trim()}
      >
        Seanss puudub
      </div>
    );
  }

  const teacherName = session?.user?.name?.trim() || session?.user?.email?.trim() || "Õpetaja";
  const teacherEmail = session?.user?.email?.trim() || "Seansile pole e-posti seotud";
  const initials = getInitials(teacherName, teacherEmail);

  return (
    <details className={`group relative ${className}`.trim()}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-sm transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-semibold text-[var(--color-brand-foreground)]">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
            {teacherName}
          </span>
          <span className="block truncate text-xs text-[var(--color-text-muted)]">
            Õpetaja seanss
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="ml-2 size-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" fill="currentColor" />
        </svg>
      </summary>

      <Card
        variant="raised"
        className="absolute right-0 z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Õpetaja identiteet
            </p>
            <p className="text-lg font-semibold text-[var(--color-text)]">{teacherName}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{teacherEmail}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Auth.js klient
            </p>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              Seanss loetakse `useSession()` kaudu ja väljalogimine käib `signOut()` abil.
            </p>
          </div>

          <Button
            variant="secondary"
            className="w-full justify-center"
            loading={isSigningOut}
            onClick={() => {
              setIsSigningOut(true);
              void signOut({ callbackUrl: "/login" });
            }}
          >
            Logi välja
          </Button>
        </div>
      </Card>
    </details>
  );
}

function getInitials(name: string, fallbackEmail: string) {
  const base = name.includes("@") ? fallbackEmail : name;
  const initials = base
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "Õ";
}
