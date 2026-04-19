# Plan A — Phase 1 Comprehensive Codebase Audit

## Goal

A complete audit report is produced covering architecture, per-source-file quality findings, AI-slop detection with severity, security/dependency risk, and performance bottlenecks, with reproducible evidence and line references.

## Assumptions

- Existing docs in `AUDIT_PLAN.md`, `PHASE_1_PLAN.md`, and `README.md` are treated as historical context; this audit revalidates current code state.
- “Every source file” means all `src/**/*.ts|tsx` excluding generated artifacts.

## Artifacts to create/modify

1. `docs/audits/2026-04-18-comprehensive-audit-report.md` (new)
2. `docs/audits/2026-04-18-ai-slop-findings.csv` (new)
3. `docs/audits/2026-04-18-file-quality-index.md` (new)
4. `docs/audits/2026-04-18-dependency-security-notes.md` (new)
5. `docs/audits/README.md` (new, index of audits)

## Dependency map

- `docs/audits/README.md` → depends on: none
- `docs/audits/2026-04-18-file-quality-index.md` → depends on: source file inventory
- `docs/audits/2026-04-18-ai-slop-findings.csv` → depends on: file-quality analysis
- `docs/audits/2026-04-18-dependency-security-notes.md` → depends on: package/dependency scan + route inspection
- `docs/audits/2026-04-18-comprehensive-audit-report.md` → depends on all three previous artifacts

---

## Wave A1

### Task A1.1 — Create audit workspace index

**Files**
- `docs/audits/README.md`

**Action**
- Create audit directory index with links and report naming convention.
- Define evidence rules: every finding includes file path, line(s), severity, rationale.

**Depends on**
- None

**Creates**
- Audit workspace anchor file.

**Verification**
- `npm run lint -- docs/audits/README.md` *(if eslint ignores md, run manual check that file exists and links resolve)*

**Done criteria**
- Audit docs folder exists with index and standards.

### Task A1.2 — Build source-file quality index skeleton

**Files**
- `docs/audits/2026-04-18-file-quality-index.md`

**Action**
- Enumerate every `src/**/*.ts|tsx` file grouped by domain.
- Add checklist fields for dead code, naming consistency, oversized functions, magic values, duplication, comment quality.

**Depends on**
- None

**Creates**
- Per-file audit matrix skeleton.

**Verification**
- `npm run test -- src/**/**.test.ts` *(sanity run to ensure repository still green before deeper audit capture)*

**Done criteria**
- All source files represented in matrix.

---

## Wave A2

### Task A2.1 — Capture AI-slop findings ledger

**Files**
- `docs/audits/2026-04-18-ai-slop-findings.csv`
- `docs/audits/2026-04-18-file-quality-index.md`

**Action**
- Populate slop hallmarks list with per-instance entries (file path, line, description, severity).
- Cross-link each file row in quality index to corresponding slop rows.

**Depends on**
- Task A1.2

**Creates**
- Machine-sortable slop evidence file.

**Verification**
- `npm run typecheck`

**Done criteria**
- All slop categories in user request are covered with explicit evidence or explicit “none found” markers.

### Task A2.2 — Capture security + dependency notes

**Files**
- `docs/audits/2026-04-18-dependency-security-notes.md`

**Action**
- Review `.env.example`, routes, auth guards, and dependency versions for likely risk patterns.
- Record exposed secret risk, unvalidated inputs, auth/authorization gaps, and potential outdated/vulnerable packages.

**Depends on**
- Task A1.2

**Creates**
- Security/dependency risk assessment artifact.

**Verification**
- `npm run lint`

**Done criteria**
- Every route family has explicit guard/validation status.

---

## Wave A3

### Task A3.1 — Assemble comprehensive audit report

**Files**
- `docs/audits/2026-04-18-comprehensive-audit-report.md`
- `docs/audits/2026-04-18-file-quality-index.md`
- `docs/audits/2026-04-18-ai-slop-findings.csv`
- `docs/audits/2026-04-18-dependency-security-notes.md`

**Action**
- Write final report sections 1.1–1.5 exactly per requested structure.
- Include architecture tree, data-flow text diagram, prioritized issue summary, and recommended remediation order.
- Link to raw evidence artifacts.

**Depends on**
- Tasks A2.1, A2.2

**Creates**
- Phase 1 deliverable report.

**Verification**
- `npm run build`

**Done criteria**
- Report complete, internally consistent, and references evidence files.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`

Manual verification:
- Report has all requested headings and severity taxonomy.
- Every finding in summary maps to exact path + line evidence.
