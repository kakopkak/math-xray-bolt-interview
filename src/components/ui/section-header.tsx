import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, actions, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`.trim()}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
        {description ? <p className="mt-2 text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
