import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "raised" | "subtle";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default:
    "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  raised:
    "border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[0_8px_28px_rgba(15,23,42,0.12)]",
  subtle: "border-[var(--color-border)]/70 bg-[var(--color-surface-raised)] shadow-none",
};

export function Card({ children, className = "", variant = "default", ...props }: Props) {
  return (
    <div
      className={`rounded-2xl border p-5 text-[var(--color-text)] ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
