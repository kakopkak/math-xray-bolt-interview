import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type SharedInputProps = {
  invalid?: boolean;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & SharedInputProps;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & SharedInputProps;

const baseInputClassName =
  "w-full rounded-xl border bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-70";

const normalBorderClassName = "border-[var(--color-border)]";
const invalidBorderClassName = "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]";

export function TextInput({ className = "", invalid = false, ...props }: TextInputProps) {
  const borderClassName = invalid ? invalidBorderClassName : normalBorderClassName;

  return (
    <input
      aria-invalid={invalid || undefined}
      className={`h-11 px-3 text-base ${baseInputClassName} ${borderClassName} ${className}`.trim()}
      {...props}
    />
  );
}

export const Input = TextInput;

export function TextArea({ className = "", invalid = false, ...props }: TextAreaProps) {
  const borderClassName = invalid ? invalidBorderClassName : normalBorderClassName;

  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={`min-h-28 px-3 py-2.5 text-base ${baseInputClassName} ${borderClassName} ${className}`.trim()}
      {...props}
    />
  );
}
