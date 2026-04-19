import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";

type ResponsiveTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  mobileLabel?: ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type Props<T> = {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  getRowId: (row: T, index: number) => string;
  emptyState?: ReactNode;
  emptyStateTitle?: ReactNode;
  emptyStateDescription?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowId,
  emptyState,
  emptyStateTitle = "Andmed puuduvad",
  emptyStateDescription = "Selles vaates pole veel ridu.",
  className = "",
  ariaLabel = "Data table",
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? <EmptyState title={emptyStateTitle} description={emptyStateDescription} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--color-border)] md:block">
        <table aria-label={ariaLabel} className="min-w-full divide-y divide-[var(--color-border)] text-sm">
          <thead className="bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-left font-semibold ${column.headerClassName ?? ""}`.trim()}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
            {rows.map((row, index) => (
              <tr key={getRowId(row, index)}>
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-top ${column.cellClassName ?? ""}`.trim()}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <div
            key={getRowId(row, index)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <dl className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="min-w-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {column.mobileLabel ?? column.header}
                  </dt>
                  <dd className="min-w-0 text-right text-sm text-[var(--color-text)]">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
