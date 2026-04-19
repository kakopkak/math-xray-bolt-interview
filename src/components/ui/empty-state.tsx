import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center ${className}`.trim()}
      role="status"
    >
      {icon ? <div className="mx-auto mb-3 flex size-10 items-center justify-center text-[var(--color-text-muted)]">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      {description ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
