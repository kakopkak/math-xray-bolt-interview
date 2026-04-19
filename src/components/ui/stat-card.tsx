import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type Props = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  trend?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, description, trend, className = "" }: Props) {
  return (
    <Card className={`space-y-2 p-4 sm:p-5 ${className}`.trim()}>
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{value}</p>
      {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {trend ? <div className="text-sm text-[var(--color-text)]">{trend}</div> : null}
    </Card>
  );
}
