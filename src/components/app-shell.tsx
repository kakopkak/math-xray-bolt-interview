'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

import TeacherUserMenu from '@/components/teacher/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';

export const LANDING_PAGE_PATHNAME = '/';

export type ShellNavAction = {
  label: string;
  href: string;
  tone: 'muted' | 'primary';
};

export const SHELL_NAV_ACTIONS: ShellNavAction[] = [
  { label: 'Õpetaja', href: '/teacher', tone: 'muted' },
  { label: 'Uus ülesanne', href: '/teacher/new', tone: 'primary' },
];

export const SHELL_NAV_SECTIONS = {
  header: SHELL_NAV_ACTIONS,
  footer: SHELL_NAV_ACTIONS,
} as const;

export function shouldBypassAppShell(pathname: string | null): boolean {
  return pathname === LANDING_PAGE_PATHNAME || pathname === '/login';
}

const SHELL_NAV_LINK_CLASSNAME =
  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]';

const SHELL_NAV_LINK_TONE_CLASSNAMES: Record<ShellNavAction['tone'], string> = {
  muted:
    'text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
  primary:
    'bg-[var(--color-brand)] text-[var(--color-brand-foreground)] hover:bg-[var(--color-brand-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isLandingPage = shouldBypassAppShell(pathname);
  const isTeacherSurface =
    pathname?.startsWith('/teacher') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/student/result');

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-lg">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-lg font-semibold tracking-tight text-[var(--color-brand)] transition-colors hover:text-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          >
            Matemaatika Röntgen
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isTeacherSurface ? (
              <>
                {SHELL_NAV_SECTIONS.header.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`${SHELL_NAV_LINK_CLASSNAME} ${SHELL_NAV_LINK_TONE_CLASSNAMES[action.tone]}`}
                  >
                    {action.label}
                  </Link>
                ))}
                {status === 'authenticated' || status === 'loading' ? <TeacherUserMenu /> : null}
              </>
            ) : (
              SHELL_NAV_SECTIONS.header.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`${SHELL_NAV_LINK_CLASSNAME} ${SHELL_NAV_LINK_TONE_CLASSNAMES[action.tone]}`}
                >
                  {action.label}
                </Link>
              ))
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 text-[var(--color-text)] sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="mt-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[var(--color-text-muted)] sm:px-6 lg:px-8">
          <p className="font-medium text-[var(--color-text)]">KoosRada · Matemaatika Röntgen</p>
          <p>Sammupõhine klassi analüütika, väärarusaamade klasterdamine ja sihitud harjutused.</p>
          <nav aria-label="Kiirviited" className="flex flex-wrap items-center gap-2 pt-1">
            {SHELL_NAV_SECTIONS.footer.map((action) => (
              <Link
                key={`footer-${action.href}`}
                href={action.href}
                className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
              >
                {action.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
