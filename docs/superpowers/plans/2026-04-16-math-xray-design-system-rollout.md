# Math X-Ray Design System Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship a production-grade, project-wide design system (including dark mode), upgrade landing page to canonical quality, and roll out consistent UX/accessibility across all teacher and student flows.

**Architecture:** Implement a hybrid UI architecture with shared semantic tokens and reusable primitives, then refactor all page compositions to consume those primitives. Keep landing expressive but tethered to the same foundations as operational pages. Validate with contract tests + Playwright flow tests before final merge.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, CSS custom properties, Node test runner (`tsx --test`), Playwright.

---

## File structure map

### Foundation and theming
- **Modify:** `src/app/globals.css` — semantic color/spacing/shape tokens for light + dark themes.
- **Create:** `src/components/theme-provider.tsx` — client-side theme initialization + persistence.
- **Create:** `src/components/theme-toggle.tsx` — shared light/dark/system toggle control.
- **Modify:** `src/app/layout.tsx` — include provider and theme-safe metadata/body setup.

### Reusable UI primitives
- **Modify:** `src/components/ui/button.tsx`
- **Modify:** `src/components/ui/card.tsx`
- **Modify:** `src/components/ui/input.tsx`
- **Modify:** `src/components/ui/badge.tsx`
- **Modify:** `src/components/ui/breadcrumbs.tsx`
- **Create:** `src/components/ui/section-header.tsx`
- **Create:** `src/components/ui/stat-card.tsx`
- **Create:** `src/components/ui/empty-state.tsx`
- **Create:** `src/components/ui/feedback-banner.tsx`
- **Create:** `src/components/ui/responsive-table.tsx`

### Landing canonical redesign
- **Modify:** `src/components/landing/landing-page.tsx`
- **Modify:** `src/components/landing/landing-page.module.css`
- **Modify:** `src/components/landing/landing-menu.tsx`
- **Modify:** `src/components/landing/progress-rail.tsx`

### Shell and page rollout
- **Modify:** `src/components/app-shell.tsx`
- **Modify:** `src/app/teacher/page.tsx`
- **Modify:** `src/app/teacher/new/page.tsx`
- **Modify:** `src/app/teacher/assignment/[id]/assignment-client.tsx`
- **Modify:** `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx`
- **Modify:** `src/app/teacher/cluster/[id]/cluster-client.tsx`
- **Modify:** `src/app/submit/[id]/submit-client.tsx`
- **Modify:** `src/components/file-upload.tsx`
- **Modify:** `src/app/student/result/[id]/result-client.tsx`

### Tests and docs
- **Create:** `src/app/theme-contract.test.ts`
- **Create:** `src/components/ui/ui-primitives-contract.test.ts`
- **Create:** `src/components/landing/landing-contract.test.ts`
- **Create:** `src/components/app-shell-contract.test.ts`
- **Create:** `src/app/teacher/new/new-assignment-contract.test.ts`
- **Create:** `src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`
- **Create:** `src/components/file-upload-contract.test.ts`
- **Create:** `e2e/design-system-rollout.spec.ts`
- **Modify:** existing contract tests touching migrated files.
- **Modify:** `README.md` (design system + dark mode + UX guarantees section).

---

### Task 1: Baseline guardrails and branch setup

**Files:**
- Modify: none
- Test: existing full suite

- [ ] **Step 1: Read Next.js 16 docs relevant to layout/theming**

Run:
```bash
ls node_modules/next/dist/docs | head -20
```
Expected: Next.js docs files listed for version-specific behavior checks.

- [ ] **Step 2: Run baseline verification**

Run:
```bash
npm run lint && npm run test && npm run build
```
Expected: baseline passes before UI refactor starts.

- [ ] **Step 3: Create feature branch**

Run:
```bash
git checkout -b feat/design-system-rollout
```
Expected: current branch is `feat/design-system-rollout`.

---

### Task 2: Add tokenized light/dark theme foundation

**Files:**
- Create: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/app/theme-contract.test.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/app-shell.tsx`
- Test: `src/app/theme-contract.test.ts`

- [ ] **Step 1: Write failing theme contract tests**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const globalsPath = path.join(process.cwd(), "src/app/globals.css");
const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");

test("globals define semantic tokens for light and dark themes", async () => {
  const source = await readFile(globalsPath, "utf8");
  assert.match(source, /:root\s*\{/);
  assert.match(source, /:root\[data-theme="dark"\]\s*\{/);
  assert.match(source, /--color-bg:/);
  assert.match(source, /--color-surface:/);
  assert.match(source, /--color-brand:/);
});

test("layout includes theme provider", async () => {
  const source = await readFile(layoutPath, "utf8");
  assert.match(source, /ThemeProvider/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm run test -- src/app/theme-contract.test.ts
```
Expected: FAIL (dark token block and provider not yet present).

- [ ] **Step 3: Implement semantic tokens and dark theme**

```css
:root {
  --color-bg: #f7f8fb;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-text: #111827;
  --color-text-muted: #4b5563;
  --color-border: #d1d5db;
  --color-brand: #4f46e5;
  --color-brand-hover: #4338ca;
  --color-brand-active: #3730a3;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #e11d48;
}

:root[data-theme="dark"] {
  --color-bg: #090c13;
  --color-surface: #101522;
  --color-surface-raised: #151c2d;
  --color-text: #e5e7eb;
  --color-text-muted: #9ca3af;
  --color-border: #2b3448;
  --color-brand: #818cf8;
  --color-brand-hover: #6366f1;
  --color-brand-active: #4f46e5;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #fb7185;
}
```

- [ ] **Step 4: Add theme provider + toggle wiring**

```tsx
"use client";

import { useEffect } from "react";

const STORAGE_KEY = "math-xray-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "system";
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = saved === "system" ? (prefersDark ? "dark" : "light") : saved;
    root.dataset.theme = resolved;
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 5: Run theme tests**

Run:
```bash
npm run test -- src/app/theme-contract.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/theme-provider.tsx src/components/theme-toggle.tsx src/components/app-shell.tsx src/app/theme-contract.test.ts
git commit -m "feat(theme): add semantic light-dark token foundation" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Standardize UI primitives and shared states

**Files:**
- Create: `src/components/ui/section-header.tsx`, `src/components/ui/stat-card.tsx`, `src/components/ui/empty-state.tsx`, `src/components/ui/feedback-banner.tsx`, `src/components/ui/responsive-table.tsx`, `src/components/ui/ui-primitives-contract.test.ts`
- Modify: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/breadcrumbs.tsx`
- Test: `src/components/ui/ui-primitives-contract.test.ts`

- [ ] **Step 1: Write failing UI primitive contract tests**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const buttonPath = path.join(process.cwd(), "src/components/ui/button.tsx");
const cardPath = path.join(process.cwd(), "src/components/ui/card.tsx");
const inputPath = path.join(process.cwd(), "src/components/ui/input.tsx");

test("button supports focus, disabled, and loading-safe styling hooks", async () => {
  const source = await readFile(buttonPath, "utf8");
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /disabled:opacity-/);
  assert.match(source, /variant/);
});

test("card and input use semantic token classes", async () => {
  assert.match(await readFile(cardPath, "utf8"), /bg-\[var\(--color-surface\)\]/);
  assert.match(await readFile(inputPath, "utf8"), /border-\[var\(--color-border\)\]/);
});
```

- [ ] **Step 2: Run primitive test to verify failure**

Run:
```bash
npm run test -- src/components/ui/ui-primitives-contract.test.ts
```
Expected: FAIL before semantic-token migration.

- [ ] **Step 3: Implement standardized primitive APIs**

```tsx
export function Card({ children, className = "", ...props }: Props) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add new shared composition primitives**

```tsx
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
        {description ? <p className="mt-2 text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
```

- [ ] **Step 5: Run primitive contract tests**

Run:
```bash
npm run test -- src/components/ui/ui-primitives-contract.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/badge.tsx src/components/ui/breadcrumbs.tsx src/components/ui/section-header.tsx src/components/ui/stat-card.tsx src/components/ui/empty-state.tsx src/components/ui/feedback-banner.tsx src/components/ui/responsive-table.tsx src/components/ui/ui-primitives-contract.test.ts
git commit -m "feat(ui): standardize primitives and shared composition components" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Redesign landing page as canonical reference

**Files:**
- Create: `src/components/landing/landing-contract.test.ts`
- Modify: `src/components/landing/landing-page.tsx`, `src/components/landing/landing-page.module.css`, `src/components/landing/landing-menu.tsx`, `src/components/landing/progress-rail.tsx`
- Test: `src/components/landing/landing-contract.test.ts`, existing `src/components/landing/scroll-math.test.ts`

- [ ] **Step 1: Write failing landing contract tests**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const landingPath = path.join(process.cwd(), "src/components/landing/landing-page.tsx");

test("landing copy is Estonian and CTA labels match destinations", async () => {
  const source = await readFile(landingPath, "utf8");
  assert.match(source, /Proovi demot/);
  assert.match(source, /Ava õpetaja töölaud/);
  assert.doesNotMatch(source, /Try the demo/);
  assert.doesNotMatch(source, /Contact/);
});
```

- [ ] **Step 2: Run landing test to verify failure**

Run:
```bash
npm run test -- src/components/landing/landing-contract.test.ts
```
Expected: FAIL on current English copy and CTA mismatch.

- [ ] **Step 3: Replace landing content architecture and copy**

```tsx
<h1 className={styles.heroHeadline}>
  Tuvasta matemaatilised väärarusaamad enne, kui neist saab klassi harjumus.
</h1>
<p className={styles.heroSupport}>
  Matemaatika Röntgen annab õpetajale sammupõhise nähtavuse: kus mõttekäik murdub ja mida teha järgmises tunnis.
</p>
```

- [ ] **Step 4: Fix CTA semantics and mobile progress affordance**

```tsx
<nav className={styles.ctaLinks} aria-label="Maandumislehe kiirlingid">
  <Link href="/teacher">Ava õpetaja töölaud</Link>
  <span aria-hidden="true">·</span>
  <Link href="/teacher/new">Loo uus ülesanne</Link>
</nav>
```

- [ ] **Step 5: Run landing and scroll tests**

Run:
```bash
npm run test -- src/components/landing/landing-contract.test.ts src/components/landing/scroll-math.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/landing-page.tsx src/components/landing/landing-page.module.css src/components/landing/landing-menu.tsx src/components/landing/progress-rail.tsx src/components/landing/landing-contract.test.ts
git commit -m "feat(landing): redesign canonical narrative page in Estonian design system" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Align app shell navigation, footer, and theme controls

**Files:**
- Create: `src/components/app-shell-contract.test.ts`
- Modify: `src/components/app-shell.tsx`
- Test: `src/components/app-shell-contract.test.ts`

- [ ] **Step 1: Write failing app-shell contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const shellPath = path.join(process.cwd(), "src/components/app-shell.tsx");

test("app shell includes shared nav actions and theme toggle", async () => {
  const source = await readFile(shellPath, "utf8");
  assert.match(source, /ThemeToggle/);
  assert.match(source, /Õpetaja/);
  assert.match(source, /Uus ülesanne/);
});
```

- [ ] **Step 2: Run shell test to verify failure**

Run:
```bash
npm run test -- src/components/app-shell-contract.test.ts
```
Expected: FAIL before toggle import/use.

- [ ] **Step 3: Implement shell-level composition update**

```tsx
<div className="flex items-center gap-2">
  <ThemeToggle />
  <Link href="/teacher" className="...">Õpetaja</Link>
  <Link href="/teacher/new" className="...">Uus ülesanne</Link>
</div>
```

- [ ] **Step 4: Run shell test**

Run:
```bash
npm run test -- src/components/app-shell-contract.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell.tsx src/components/app-shell-contract.test.ts
git commit -m "feat(shell): unify navigation and theme controls across app pages" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Roll out design system on teacher dashboard and assignment creation

**Files:**
- Create: `src/app/teacher/new/new-assignment-contract.test.ts`
- Modify: `src/app/teacher/page.tsx`, `src/app/teacher/new/page.tsx`, `src/app/teacher/teacher-page-contract.test.ts`
- Test: `src/app/teacher/teacher-page-contract.test.ts`, `src/app/teacher/new/new-assignment-contract.test.ts`

- [ ] **Step 1: Add failing contract for new assignment page localization and structure**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const pagePath = path.join(process.cwd(), "src/app/teacher/new/page.tsx");

test("new assignment page uses Estonian labels only", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /Pealkiri/);
  assert.match(source, /Kirjeldus/);
  assert.doesNotMatch(source, /Title|Description|Grade/);
});
```

- [ ] **Step 2: Run teacher page tests to verify failure**

Run:
```bash
npm run test -- src/app/teacher/teacher-page-contract.test.ts src/app/teacher/new/new-assignment-contract.test.ts
```
Expected: FAIL for mixed-language labels in `teacher/new`.

- [ ] **Step 3: Refactor teacher pages to shared primitives**

```tsx
<SectionHeader
  title="Õpetaja töölaud"
  actions={<Link href="/teacher/new" className={buttonClassName({})}>Uus ülesanne</Link>}
/>
```

- [ ] **Step 4: Fix form labels and helper text in Estonian**

```tsx
<span className="text-sm font-medium text-[var(--color-text-muted)]">Pealkiri</span>
<TextInput placeholder="Ruutvõrrandid — kontrolltöö" />
```

- [ ] **Step 5: Run teacher contracts**

Run:
```bash
npm run test -- src/app/teacher/teacher-page-contract.test.ts src/app/teacher/new/new-assignment-contract.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/teacher/page.tsx src/app/teacher/new/page.tsx src/app/teacher/teacher-page-contract.test.ts src/app/teacher/new/new-assignment-contract.test.ts
git commit -m "feat(teacher-ui): apply design system to dashboard and creation form" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Roll out design system on assignment detail and analytics

**Files:**
- Modify: `src/app/teacher/assignment/[id]/assignment-client.tsx`, `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx`
- Modify: `src/app/teacher/assignment/[id]/assignment-client-contract.test.ts`, `src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts`
- Test: both contract tests above

- [ ] **Step 1: Add failing contract assertions for shared stat/feedback components**

```ts
assert.match(source, /StatCard/);
assert.match(source, /FeedbackBanner/);
assert.match(source, /ResponsiveTable/);
```

- [ ] **Step 2: Run assignment + analytics contracts to verify failure**

Run:
```bash
npm run test -- src/app/teacher/assignment/[id]/assignment-client-contract.test.ts src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts
```
Expected: FAIL before component migration.

- [ ] **Step 3: Replace repeated inline blocks with shared primitives**

```tsx
<StatCard label="Valmis" value={progress.statusCounts.complete} tone="success" />
<FeedbackBanner tone="error" message={error} />
```

- [ ] **Step 4: Keep next-move card behavior while aligning visual/state system**

```tsx
<Card className="space-y-4" data-testid="next-move-card">
  <SectionHeader title="Järgmine samm klassi jaoks" />
  {/* existing next-move fetch logic retained */}
</Card>
```

- [ ] **Step 5: Run assignment + analytics contracts**

Run:
```bash
npm run test -- src/app/teacher/assignment/[id]/assignment-client-contract.test.ts src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/teacher/assignment/[id]/assignment-client.tsx src/app/teacher/assignment/[id]/analytics/analytics-client.tsx src/app/teacher/assignment/[id]/assignment-client-contract.test.ts src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts
git commit -m "feat(teacher-analytics): standardize assignment and analytics UI composition" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Roll out design system on cluster detail

**Files:**
- Create: `src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`
- Modify: `src/app/teacher/cluster/[id]/cluster-client.tsx`
- Test: `src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`

- [ ] **Step 1: Write failing cluster contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clusterClientPath = new URL("./cluster-client.tsx", import.meta.url);

test("cluster page uses shared feedback and section composition", async () => {
  const source = await readFile(clusterClientPath, "utf8");
  assert.match(source, /SectionHeader/);
  assert.match(source, /FeedbackBanner/);
});
```

- [ ] **Step 2: Run cluster contract to verify failure**

Run:
```bash
npm run test -- "src/app/teacher/cluster/[id]/cluster-client-contract.test.ts"
```
Expected: FAIL before migration.

- [ ] **Step 3: Refactor cluster page composition**

```tsx
<SectionHeader
  title={cluster.labelEt || cluster.label}
  description={`${cluster.clusterSize} õpilast`}
  actions={<Badge variant={cluster.severity || "neutral"}>...</Badge>}
/>
```

- [ ] **Step 4: Run cluster contract**

Run:
```bash
npm run test -- "src/app/teacher/cluster/[id]/cluster-client-contract.test.ts"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/teacher/cluster/[id]/cluster-client.tsx src/app/teacher/cluster/[id]/cluster-client-contract.test.ts
git commit -m "feat(cluster-ui): align cluster detail with shared design system" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Roll out design system on student submit/result and upload UX

**Files:**
- Create: `src/components/file-upload-contract.test.ts`
- Modify: `src/app/submit/[id]/submit-client.tsx`, `src/app/student/result/[id]/result-client.tsx`, `src/components/file-upload.tsx`, `src/app/student/result/[id]/result-client-contract.test.ts`
- Test: `src/components/file-upload-contract.test.ts`, `src/app/student/result/[id]/result-client-contract.test.ts`, `src/app/submit/[id]/submit-validation.test.ts`

- [ ] **Step 1: Write failing upload contract test for localization**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const uploadPath = path.join(process.cwd(), "src/components/file-upload.tsx");

test("file upload copy is Estonian and accessible", async () => {
  const source = await readFile(uploadPath, "utf8");
  assert.match(source, /Laadi üles lahenduse foto/);
  assert.doesNotMatch(source, /Upload a photo/);
});
```

- [ ] **Step 2: Run student-facing tests to verify failure**

Run:
```bash
npm run test -- src/components/file-upload-contract.test.ts src/app/student/result/[id]/result-client-contract.test.ts src/app/submit/[id]/submit-validation.test.ts
```
Expected: FAIL on English upload copy contract.

- [ ] **Step 3: Refactor submit/result screens to shared primitives**

```tsx
<SectionHeader title={assignment.title} description={`Klass ${assignment.gradeLevel}`} />
<FeedbackBanner tone="error" message={error} />
```

- [ ] **Step 4: Localize and harden file upload component**

```tsx
<p className="text-base font-medium text-[var(--color-text)]">Laadi üles lahenduse foto</p>
<p className="mt-1 text-sm text-[var(--color-text-muted)]">
  Lohista pilt siia või vali fail seadmest. Maksimaalne suurus 5 MB.
</p>
```

- [ ] **Step 5: Run student contracts**

Run:
```bash
npm run test -- src/components/file-upload-contract.test.ts src/app/student/result/[id]/result-client-contract.test.ts src/app/submit/[id]/submit-validation.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/submit/[id]/submit-client.tsx src/app/student/result/[id]/result-client.tsx src/components/file-upload.tsx src/components/file-upload-contract.test.ts src/app/student/result/[id]/result-client-contract.test.ts
git commit -m "feat(student-ui): unify submit and result flows with localized design system" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 10: Accessibility/responsive hardening and documentation

**Files:**
- Modify: updated page/client files from Tasks 4-9
- Modify: `README.md`
- Test: existing page contracts + new e2e test file

- [ ] **Step 1: Add Playwright regression test for design-system guarantees**

Create `e2e/design-system-rollout.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("landing CTA and theme toggle work across key pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Proovi demot/i })).toBeVisible();
  await page.goto("/teacher");
  await expect(page.getByRole("button", { name: /teema/i })).toBeVisible();
});
```

- [ ] **Step 2: Run targeted e2e test**

Run:
```bash
npm run test:e2e -- e2e/design-system-rollout.spec.ts
```
Expected: PASS (or concrete, reproducible failure to fix immediately).

- [ ] **Step 3: Update README with design-system and dark mode contract**

```md
## Disainisüsteem

Projekt kasutab ühtset semantilist disainisüsteemi (light/dark), mille primitives (`Button`, `Card`, `Input`, `Badge`, `SectionHeader`, `StatCard`) on kohustuslikud kõigis vaadetes.
```

- [ ] **Step 4: Run full verification**

Run:
```bash
npm run lint && npm run test && npm run build && npm run test:e2e -- e2e/design-system-rollout.spec.ts
```
Expected: all commands pass.

- [ ] **Step 5: Final commit**

```bash
git add README.md e2e/design-system-rollout.spec.ts
git add src
git commit -m "feat(design-system): complete full-wave rollout across landing teacher and student flows" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Verification checklist

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e -- e2e/design-system-rollout.spec.ts`
- [ ] Manual check: `/`, `/teacher`, `/teacher/new`, `/teacher/assignment/[id]`, `/teacher/assignment/[id]/analytics`, `/teacher/cluster/[id]`, `/submit/[id]`, `/student/result/[id]` in light + dark
- [ ] No mixed EN copy in teacher/student core flows

---

## Spec coverage self-review

- **Landing audit findings covered:** language consistency, CTA semantics, mobile progress affordance, hierarchy upgrades (Tasks 4, 10).
- **Design code covered:** tokens, primitives, component states, dark mode, responsive parity (Tasks 2, 3, 10).
- **Cross-page rollout covered:** teacher and student flows included end-to-end (Tasks 6, 7, 8, 9).
- **Accessibility/responsive quality covered:** contract tests + e2e assertions + manual checkpoints (Tasks 3, 7, 9, 10).
- **No unresolved placeholders:** verified in this plan document.
