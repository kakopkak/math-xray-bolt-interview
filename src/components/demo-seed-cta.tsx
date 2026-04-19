'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClassName } from '@/components/ui/button';

type SeedResponse = {
  assignmentId?: string;
  error?: string;
};

type DemoSeedCtaProps = {
  demoSeedToken?: string;
  label?: string;
  loadingLabel?: string;
  className?: string;
  errorClassName?: string;
};

export function DemoSeedCta({
  demoSeedToken = "",
  label = 'Proovi demot',
  loadingLabel = 'Laen demot…',
  className = '',
  errorClassName = 'text-sm text-[var(--color-error)]',
}: DemoSeedCtaProps = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/assignments/seed', {
        method: 'POST',
        headers: demoSeedToken
          ? {
              'x-demo-token': demoSeedToken,
            }
          : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as SeedResponse;

      if (!response.ok || !payload.assignmentId) {
        setError(payload.error || 'Demo andmestiku loomine ebaõnnestus.');
        return;
      }

      const assignmentId = payload.assignmentId;
      router.push(`/teacher/assignment/${assignmentId}`);
    } catch {
      setError('Demo andmestiku loomine ebaõnnestus.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={buttonClassName({
          variant: 'secondary',
          className,
        })}
      >
        {isLoading ? loadingLabel : label}
      </button>
      {error ? <p className={errorClassName}>{error}</p> : null}
    </div>
  );
}
