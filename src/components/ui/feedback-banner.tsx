import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type FeedbackBannerTone = "info" | "success" | "warning" | "error";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  message: ReactNode;
  action?: ReactNode;
  tone?: FeedbackBannerTone;
};

type FeedbackToneStyle = CSSProperties &
  Record<"--feedback-bg" | "--feedback-fg" | "--feedback-border", string>;

const toneStyles: Record<FeedbackBannerTone, FeedbackToneStyle> = {
  info: {
    "--feedback-bg": "var(--color-surface-raised)",
    "--feedback-fg": "var(--color-text)",
    "--feedback-border": "var(--color-border)",
  },
  success: {
    "--feedback-bg": "color-mix(in oklab, var(--color-success) 12%, var(--color-surface))",
    "--feedback-fg": "var(--color-success)",
    "--feedback-border": "color-mix(in oklab, var(--color-success) 40%, var(--color-border))",
  },
  warning: {
    "--feedback-bg": "color-mix(in oklab, var(--color-warning) 12%, var(--color-surface))",
    "--feedback-fg": "var(--color-warning)",
    "--feedback-border": "color-mix(in oklab, var(--color-warning) 40%, var(--color-border))",
  },
  error: {
    "--feedback-bg": "color-mix(in oklab, var(--color-error) 12%, var(--color-surface))",
    "--feedback-fg": "var(--color-error)",
    "--feedback-border": "color-mix(in oklab, var(--color-error) 40%, var(--color-border))",
  },
};

export function FeedbackBanner({
  title,
  message,
  action,
  tone = "info",
  className = "",
  style,
  ...props
}: Props) {
  return (
    <div
      className={`rounded-xl border border-[var(--feedback-border)] bg-[var(--feedback-bg)] px-4 py-3 text-[var(--feedback-fg)] ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
      style={{ ...toneStyles[tone], ...style }}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <p className="text-sm">{message}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
