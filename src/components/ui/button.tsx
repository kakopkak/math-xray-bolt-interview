import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  loading?: boolean;
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-brand)] text-[var(--color-brand-foreground)] shadow-sm hover:bg-[var(--color-brand-hover)] active:bg-[var(--color-brand-active)]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] active:bg-[var(--color-surface-raised)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] active:bg-[var(--color-surface-raised)]",
  destructive:
    "bg-[var(--color-error)] text-white shadow-sm hover:opacity-95 active:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-5 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
}: ButtonClassNameOptions) {
  const loadingClassName = loading ? "opacity-80" : "";

  return `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60 ${loadingClassName} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className, loading })}
      disabled={isDisabled}
      data-loading={loading ? "true" : "false"}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
