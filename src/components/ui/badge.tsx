import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type BadgeVariant =
  | "none"
  | "minor"
  | "major"
  | "fundamental"
  | "neutral"
  | "success"
  | "error";

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

type BadgeToneStyle = CSSProperties &
  Record<"--badge-bg" | "--badge-fg" | "--badge-border", string>;

const variantStyles: Record<BadgeVariant, BadgeToneStyle> = {
  none: {
    "--badge-bg": "color-mix(in oklab, var(--color-success) 16%, var(--color-surface))",
    "--badge-fg": "var(--color-success)",
    "--badge-border": "color-mix(in oklab, var(--color-success) 35%, var(--color-border))",
  },
  minor: {
    "--badge-bg": "color-mix(in oklab, var(--color-warning) 14%, var(--color-surface))",
    "--badge-fg": "var(--color-warning)",
    "--badge-border": "color-mix(in oklab, var(--color-warning) 35%, var(--color-border))",
  },
  major: {
    "--badge-bg": "color-mix(in oklab, var(--color-warning) 24%, var(--color-surface))",
    "--badge-fg": "var(--color-warning)",
    "--badge-border": "color-mix(in oklab, var(--color-warning) 50%, var(--color-border))",
  },
  fundamental: {
    "--badge-bg": "color-mix(in oklab, var(--color-error) 24%, var(--color-surface))",
    "--badge-fg": "var(--color-error)",
    "--badge-border": "color-mix(in oklab, var(--color-error) 50%, var(--color-border))",
  },
  neutral: {
    "--badge-bg": "var(--color-surface-raised)",
    "--badge-fg": "var(--color-text-muted)",
    "--badge-border": "var(--color-border)",
  },
  success: {
    "--badge-bg": "color-mix(in oklab, var(--color-success) 20%, var(--color-surface))",
    "--badge-fg": "var(--color-success)",
    "--badge-border": "color-mix(in oklab, var(--color-success) 40%, var(--color-border))",
  },
  error: {
    "--badge-bg": "color-mix(in oklab, var(--color-error) 20%, var(--color-surface))",
    "--badge-fg": "var(--color-error)",
    "--badge-border": "color-mix(in oklab, var(--color-error) 40%, var(--color-border))",
  },
};

export function Badge({ variant = "neutral", className = "", children, style, ...props }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide border-[var(--badge-border)] bg-[var(--badge-bg)] text-[var(--badge-fg)] ${className}`.trim()}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
