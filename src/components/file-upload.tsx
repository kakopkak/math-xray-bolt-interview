"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function FileUpload({ value, onChange, disabled = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const previewSrc = useMemo(() => (value.startsWith("data:image") ? value : ""), [value]);

  async function handleFile(file: File | null) {
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError("Fail on liiga suur. Maksimaalne lubatud suurus on 5 MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
      setError("");
    } catch {
      setError("Faili töötlemine ebaõnnestus. Palun proovi teist pilti.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    void handleFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] || null;
    void handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-5 transition-colors ${
          isDragging
            ? "border-[var(--color-brand)] bg-[color-mix(in_oklab,var(--color-brand)_8%,var(--color-surface))]"
            : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
        }`}
      >
        <p className="text-base font-medium text-[var(--color-text)]">Lisa foto</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Lohista siia või vali fail (max 5 MB).
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            Vali fail
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
          >
            Kasuta kaamerat
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={disabled}
          aria-label="Vali pildifail"
          className="hidden"
          onChange={onInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          aria-label="Kasuta kaamerat"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {previewSrc && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Eelvaade</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Üles laaditud lahenduse eelvaade"
            className="max-h-64 rounded-lg object-contain"
          />
        </div>
      )}

      {error && (
        <div aria-live="polite" aria-atomic="true">
          <FeedbackBanner tone="error" message={error} />
        </div>
      )}
    </div>
  );
}
