"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

type Step = {
  title: string;
  description: string;
  cue: string;
  cueClassName: string;
};

const steps: Step[] = [
  {
    title: "Klasterdiagramm",
    description: "Siit näed, millised väärarusaamad mõjutavad kõige rohkem õpilasi.",
    cue: "➜ Väärarusaamade kaardistus",
    cueClassName: "left-1/2 top-[36%] -translate-x-1/2",
  },
  {
    title: "Klastrikaardid",
    description: "Ava kaardilt detailvaade, et näha konkreetseid eksisamme ja soovitatud sekkumisi.",
    cue: "➜ Klastri detaili avamine",
    cueClassName: "bottom-16 left-6",
  },
  {
    title: "Ava analüütika",
    description: "Kasuta analüütika nuppu, et vaadata klassi ülesannete trendi ja arengut.",
    cue: "➜ Analüütika ülevaade",
    cueClassName: "right-8 top-24",
  },
];

export default function DemoWalkthrough({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const step = steps[stepIndex];

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      onClose();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [onClose]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableControls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute("disabled"));

    const firstFocusable = focusableControls[0];
    const lastFocusable = focusableControls[focusableControls.length - 1];
    if (!firstFocusable || !lastFocusable) return;

    const activeElement = document.activeElement as HTMLElement | null;
    const isFocusOutsideDialog = !activeElement || !dialog.contains(activeElement);

    if (event.shiftKey) {
      if (isFocusOutsideDialog || activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
      return;
    }

    if (isFocusOutsideDialog || activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-zinc-950/55" />

      {steps.map((item, index) => (
        <div
          key={item.title}
          className={`pointer-events-none absolute hidden rounded-lg border border-indigo-200 bg-white/95 px-3 py-2 text-sm font-medium text-indigo-700 shadow-md sm:flex ${item.cueClassName} ${index === stepIndex ? "opacity-100" : "opacity-45"}`}
        >
          {item.cue}
        </div>
      ))}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Demo juhend"
        onKeyDown={handleDialogKeyDown}
        className="pointer-events-auto absolute inset-x-4 bottom-6 mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Samm {stepIndex + 1}/{steps.length}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-zinc-900">{step.title}</h3>
        <p className="mt-2 text-sm text-zinc-700">{step.description}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} autoFocus>
            Sulge
          </Button>
          <Button onClick={handleNext}>Järgmine</Button>
        </div>
      </div>
    </div>
  );
}
