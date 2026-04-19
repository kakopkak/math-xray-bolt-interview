"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FeedbackBanner } from '@/components/ui/feedback-banner';

type NotebookEntry = {
  at: string;
  note: string;
};

type NotebookResponse = {
  entries?: NotebookEntry[];
  error?: string;
};

type Props = {
  topic: string;
};

export default function TopicNotebook({ topic }: Props) {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadNotebook() {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/teacher/notebook/${topic}`, { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as NotebookResponse;
        if (!response.ok) {
          setError(payload.error || 'Märkmiku laadimine ebaõnnestus.');
          return;
        }
        setEntries(payload.entries || []);
      } catch {
        setError('Märkmiku laadimine ebaõnnestus.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotebook();
  }, [topic]);

  async function saveNote() {
    const trimmed = note.trim();
    if (!trimmed) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/teacher/notebook/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed }),
      });
      const payload = (await response.json().catch(() => ({}))) as NotebookResponse;
      if (!response.ok) {
        setError(payload.error || 'Märkuse salvestamine ebaõnnestus.');
        return;
      }
      setEntries(payload.entries || []);
      setNote('');
    } catch {
      setError('Märkuse salvestamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Õpetaja märkmik</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Teema: {topic}</p>

      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="topic-note">
          Lisa märkus
        </label>
        <textarea
          id="topic-note"
          className="min-h-28 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Kirjuta tähelepanek või soovitus..."
        />
        <div>
          <Button onClick={() => void saveNote()} disabled={isSaving || note.trim().length === 0}>
            {isSaving ? 'Salvestan…' : 'Lisa märkus'}
          </Button>
        </div>
      </div>

      {error ? <FeedbackBanner className="mt-3" tone="error" message={error} /> : null}

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Märkmed laaditakse…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Märkmeid veel ei ole.</p>
        ) : (
          entries
            .slice()
            .reverse()
            .map((entry, index) => (
              <div
                key={`${entry.at}-${index}`}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                {entry.note}
              </div>
            ))
        )}
      </div>
    </Card>
  );
}