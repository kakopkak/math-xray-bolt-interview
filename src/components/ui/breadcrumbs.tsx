import type { ReactNode } from "react";
import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
  separator?: ReactNode;
};

export function Breadcrumbs({ items, separator = "/" }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-text-muted)]">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="rounded-md px-1 text-[var(--color-brand)] underline-offset-4 transition-colors hover:text-[var(--color-brand-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className="font-medium text-[var(--color-text)]">
                  {item.label}
                </span>
              )}
              {index < items.length - 1 ? <span className="text-[var(--color-text-muted)]">{separator}</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
