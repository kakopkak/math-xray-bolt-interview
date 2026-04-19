# Plan B — Phase 2 Refactoring & Slop Elimination

## Goal

High and critical findings from Phase 1 are refactored to satisfy non-negotiable rules: semantically accurate naming, dead-code removal, constant extraction, DRY utility extraction, strict catch-block handling, and TODO/FIXME/HACK cleanup; each change is documented with before/after diff evidence.

## Scope constraints

- This plan executes **only** after Plan A completion.
- No feature work is mixed into this plan.
- If >6 tasks emerge from findings, split into follow-up refactor plans by layer.

## Artifacts to create/modify

### Refactor tracking artifacts
1. `docs/refactors/2026-04-18-phase-2-refactor-log.md` (new)
2. `docs/refactors/2026-04-18-phase-2-diff-evidence.md` (new)

### Core code targets (anticipated from current audit context)
3. `src/lib/constants/pipeline.ts` (new)
4. `src/lib/constants/dashboard.ts` (new)
5. `src/lib/super-dashboard/engine.ts` (modify)
6. `src/app/teacher/assignment/[id]/assignment-client.tsx` (modify)
7. `src/app/teacher/super-dashboard-client.tsx` (modify)
8. `src/lib/ai/pipeline.ts` (modify)
9. `src/app/api/assignments/[id]/submit/route.ts` (modify)
10. `src/app/teacher/cluster/[id]/cluster-client.tsx` (modify)
11. `src/lib/teacher-copy.ts` (modify)

### Test updates
12. `src/lib/structured-logger-rollout-contract.test.ts` (modify)
13. `src/app/teacher/super-dashboard-client-contract.test.ts` (modify)
14. `src/app/teacher/assignment/[id]/assignment-client-contract.test.ts` (modify)

## Dependency map

- `docs/refactors/2026-04-18-phase-2-refactor-log.md` → none
- constants files → none
- `src/lib/super-dashboard/engine.ts` → depends on constants
- UI clients → depend on constants and any extracted helpers
- `src/lib/ai/pipeline.ts` + API route logging changes → depend on logger conventions
- contract tests → depend on implementation updates
- diff evidence doc → depends on all refactor tasks complete

---

## Wave B1

### Task B1.1 — Establish refactor log + constants baseline

**Files**
- `docs/refactors/2026-04-18-phase-2-refactor-log.md`
- `src/lib/constants/pipeline.ts`
- `src/lib/constants/dashboard.ts`

**Action**
- Create log template listing each finding ID, resolution, and status.
- Extract obvious magic values (timeouts, polling intervals, thresholds) into constants modules.

**Depends on**
- Plan A findings

**Creates**
- Shared constants foundation and traceability doc.

**Verification**
- `npm run typecheck`

**Done criteria**
- Constants used by at least one downstream target; log initialized.

---

## Wave B2

### Task B2.1 — Refactor dashboard engine hotspots

**Files**
- `src/lib/super-dashboard/engine.ts`
- `src/lib/constants/dashboard.ts`
- `src/lib/structured-logger-rollout-contract.test.ts`

**Action**
- Remove duplicated logic blocks and extract local pure helpers where needed.
- Replace hardcoded thresholds/numbers with named constants.
- Ensure catch/error paths use structured logger metadata.

**Depends on**
- Task B1.1

**Creates**
- Cleaner, less duplicated dashboard aggregation path.

**Verification**
- `npm run test -- src/lib/super-dashboard/engine.test.ts src/lib/structured-logger-rollout-contract.test.ts`

**Done criteria**
- No unresolved dead branches in touched sections; tests pass.

### Task B2.2 — Refactor assignment + super dashboard clients for DRY/tokens

**Files**
- `src/app/teacher/assignment/[id]/assignment-client.tsx`
- `src/app/teacher/super-dashboard-client.tsx`
- `src/app/teacher/assignment/[id]/assignment-client-contract.test.ts`

**Action**
- Remove duplicated UI decision logic (badge mapping, trend/tone conversion) into local helper blocks or shared utilities.
- Replace inline magic strings/numbers with constants where relevant.
- Preserve semantic naming consistency.

**Depends on**
- Task B1.1

**Creates**
- Reduced UI duplication and clearer naming.

**Verification**
- `npm run test -- src/app/teacher/assignment/[id]/assignment-client-contract.test.ts src/app/teacher/super-dashboard-client-contract.test.ts`

**Done criteria**
- Contract tests pass; duplicated logic count reduced in touched files.

---

## Wave B3

### Task B3.1 — Harden pipeline/API catch blocks and cleanup technical debt comments

**Files**
- `src/lib/ai/pipeline.ts`
- `src/app/api/assignments/[id]/submit/route.ts`
- `src/app/teacher/cluster/[id]/cluster-client.tsx`

**Action**
- Update catch blocks to structured log + context or explicit rethrow policy.
- Remove resolved/stale TODO/FIXME/HACK comments; convert valid future work into issue references in refactor log.
- Ensure no swallowed errors in touched paths.

**Depends on**
- Task B1.1

**Creates**
- Consistent error handling behavior.

**Verification**
- `npm run test -- src/lib/pipeline-timeout.test.ts src/app/api/submissions/submission-sweeper-route-contract.test.ts`

**Done criteria**
- Catch blocks in touched files comply with non-negotiable rule #6.

### Task B3.2 — Record before/after diff evidence

**Files**
- `docs/refactors/2026-04-18-phase-2-diff-evidence.md`
- `docs/refactors/2026-04-18-phase-2-refactor-log.md`

**Action**
- Capture side-by-side diff blocks for each refactor item (original vs replacement).
- Mark each finding ID as resolved/deferred with rationale.

**Depends on**
- Tasks B2.1, B2.2, B3.1

**Creates**
- Phase 2 evidence deliverable.

**Verification**
- Manual checklist: every touched file has corresponding diff evidence block.

**Done criteria**
- Full traceability from finding → code change → verification.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

Manual verification:
- No dead code remains in touched files.
- No magic numbers remain where constants were introduced.
- Refactor log includes deferred items with explicit justification.
