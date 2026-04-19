"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function homeworkStatusLabel(status: string): string {
  if (status === 'active') return 'Saadetud';
  if (status === 'completed') return 'Vastatud';
  if (status === 'expired') return 'Aegunud';
  return status;
}

type TabKey = 'summary' | 'submissions' | 'misconceptions' | 'homework' | 'parent-briefs';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'summary', label: 'Kokkuvõte' },
  { key: 'submissions', label: 'Esitused' },
  { key: 'misconceptions', label: 'Väärarusaamad' },
  { key: 'homework', label: 'Kodutööd' },
  { key: 'parent-briefs', label: 'Lapsevanema kirjad' },
];

type Props = {
  studentKey: string;
  initialProfile: {
    studentName: string;
    summary: {
      totalSubmissions: number;
      completeSubmissions: number;
      latestPrimaryMisconception: string | null;
    };
    submissions: Array<{
      id: string;
      processingStatus: string;
      primaryMisconception: string | null;
      severityScore: number;
      createdAt: string | Date;
    }>;
    misconceptions: Array<{
      code: string;
      count: number;
    }>;
    homework: Array<{
      id: string;
      title: string;
      status: string;
      shareToken: string;
      dueAt: string | Date | null;
    }>;
    parentBriefs: Array<{
      id: string;
      bodyEt: string;
      generatedAt: string | Date;
      sentAt: string | Date | null;
    }>;
  };
};

export default function StudentClient({ studentKey, initialProfile }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{initialProfile.studentName || studentKey}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Õpilase trajektoor</p>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === 'summary' ? (
          <div className="mt-4 space-y-1 text-sm">
            <p>Esitusi kokku: {initialProfile.summary.totalSubmissions}</p>
            <p>Valmis analüüse: {initialProfile.summary.completeSubmissions}</p>
            <p>Viimane põhiviga: {initialProfile.summary.latestPrimaryMisconception || '—'}</p>
          </div>
        ) : null}

        {activeTab === 'submissions' ? (
          <ul className="mt-4 space-y-2 text-sm">
            {initialProfile.submissions.map((row) => (
              <li key={row.id} className="rounded-lg border border-[var(--color-border)] p-2">
                {row.processingStatus} · {row.primaryMisconception || '—'}
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'misconceptions' ? (
          <ul className="mt-4 space-y-2 text-sm">
            {initialProfile.misconceptions.map((row) => (
              <li key={row.code} className="rounded-lg border border-[var(--color-border)] p-2">
                {row.code} · {row.count}
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'homework' ? (
          <ul className="mt-4 space-y-2 text-sm">
            {initialProfile.homework.map((row) => (
              <li key={row.id} className="rounded-lg border border-[var(--color-border)] p-2">
                <p className="font-medium text-[var(--color-text)]">{row.title}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {homeworkStatusLabel(row.status)} · <a href={`/solve/${row.shareToken}`} className="underline">
                    Ava ülesanne
                  </a>
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'parent-briefs' ? (
          <ul className="mt-4 space-y-2 text-sm">
            {initialProfile.parentBriefs.map((row) => (
              <li key={row.id} className="rounded-lg border border-[var(--color-border)] p-2">
                {row.bodyEt}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}