import { useId } from "react";

type SegmentedOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

type Props<Value extends string> = {
  value: Value;
  options: ReadonlyArray<SegmentedOption<Value>>;
  onChange: (value: Value) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
};

export function SegmentedControl<Value extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
}: Props<Value>) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 ${className}`.trim()}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            id={`${groupId}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            onClick={() => onChange(option.value)}
            className={`min-h-10 min-w-24 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
