# Plan G — Phase 3 Features 9–10 (Intervention Impact + Bulk Review Queue Actions)

## Goal

Teacher actions become attributable to outcomes over time, and teachers can triage high-volume review queues with safe bulk operations.

## User needs solved

1. Teachers need proof that interventions improve outcomes.
2. Teachers need efficient multi-row review workflows instead of one-by-one updates.

## Features in this plan

9. **Intervention Impact Attribution**
10. **Bulk Review Queue Actions**

## Artifacts to create/modify

### Intervention impact
1. `src/lib/models/teacher-action.ts` (new)
2. `src/lib/intervention/engine.ts` (new)
3. `src/app/api/teacher/intervention-impact/route.ts` (new)
4. `src/app/api/teacher/interventions/route.ts` (modify)
5. `src/app/api/teacher/interventions/[id]/route.ts` (modify)
6. `src/app/api/parent-brief/generate/route.ts` (modify)
7. `src/app/api/homework/push/route.ts` (modify)
8. `src/app/teacher/super-dashboard-client.tsx` (modify)
9. `src/app/teacher/student/[studentKey]/student-client.tsx` (modify)
10. `src/app/api/teacher/intervention-impact-route-contract.test.ts` (new)

### Bulk review queue actions
11. `src/lib/schemas/review.ts` (modify)
12. `src/app/api/submissions/[id]/review/route.ts` (modify)
13. `src/app/api/submissions/bulk-review/route.ts` (new)
14. `src/app/api/submissions/submission-review-route-contract.test.ts` (modify)
15. `src/app/api/submissions/bulk-review-route-contract.test.ts` (new)
16. `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx` (modify)
17. `src/app/teacher/assignment/[id]/assignment-client.tsx` (modify)

## Dependency map

- `teacher-action` model → none
- intervention engine → depends on teacher-action model + submission joins
- intervention-impact route → depends on engine
- event-producing routes (interventions/parent-brief/homework) → depend on model
- dashboard/profile UI cards → depend on intervention-impact route
- bulk-review schema + route → depends on review schema
- analytics/assignment clients bulk UI → depend on bulk route contract

---

## Wave G1

### Task G1.1 — Implement teacher action model + aggregation engine

**Files**
- `src/lib/models/teacher-action.ts`
- `src/lib/intervention/engine.ts`
- `src/app/api/teacher/intervention-impact/route.ts`

**Action**
- Define normalized teacher action events and outcome linking logic.
- Build route for weekly impact summary and action-type breakdown.

**Depends on**
- Plan C and D event streams available

**Creates**
- Impact computation backend.

**Verification**
- `npm run test -- src/app/api/teacher/intervention-impact-route-contract.test.ts`

**Done criteria**
- Route returns tracked/improved/breakdown metrics.

### Task G1.2 — Wire action emission from existing routes

**Files**
- `src/app/api/teacher/interventions/route.ts`
- `src/app/api/teacher/interventions/[id]/route.ts`
- `src/app/api/parent-brief/generate/route.ts`

**Action**
- Emit teacher-action records on create/update/generate operations.

**Depends on**
- Task G1.1

**Creates**
- Consistent action logging across key workflows.

**Verification**
- `npm run test -- src/app/api/teacher/interventions/route-contract.test.ts`

**Done criteria**
- Relevant endpoints create action records with context fields.

### Task G1.3 — Complete action emission and UI impact visibility

**Files**
- `src/app/api/homework/push/route.ts`
- `src/app/teacher/super-dashboard-client.tsx`
- `src/app/teacher/student/[studentKey]/student-client.tsx`

**Action**
- Log homework push actions.
- Add “My impact this week” card to super dashboard and history list on profile.

**Depends on**
- Tasks G1.1, G1.2

**Creates**
- End-to-end impact visibility for teachers.

**Verification**
- `npm run test -- src/app/teacher/super-dashboard-client-contract.test.ts src/app/teacher/student/[studentKey]/student-client-contract.test.ts`

**Done criteria**
- Dashboard and student profile display intervention impact data.

---

## Wave G2

### Task G2.1 — Define bulk review schema and API route

**Files**
- `src/lib/schemas/review.ts`
- `src/app/api/submissions/bulk-review/route.ts`
- `src/app/api/submissions/bulk-review-route-contract.test.ts`

**Action**
- Add validated payload for multi-submission review operations.
- Implement bulk route with scoped authorization and partial-failure response model.

**Depends on**
- Plan B schema conventions

**Creates**
- Safe backend bulk-review endpoint.

**Verification**
- `npm run test -- src/app/api/submissions/bulk-review-route-contract.test.ts`

**Done criteria**
- Route processes multiple IDs with explicit success/failure results.

### Task G2.2 — Align single-review route and tests with shared schema

**Files**
- `src/app/api/submissions/[id]/review/route.ts`
- `src/app/api/submissions/submission-review-route-contract.test.ts`

**Action**
- Ensure single-review and bulk-review share schema semantics and validation behavior.

**Depends on**
- Task G2.1

**Creates**
- Consistent review API behavior.

**Verification**
- `npm run test -- src/app/api/submissions/submission-review-route-contract.test.ts`

**Done criteria**
- Single and bulk routes agree on payload constraints.

### Task G2.3 — Add bulk queue UI controls in assignment/analytics

**Files**
- `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx`
- `src/app/teacher/assignment/[id]/assignment-client.tsx`

**Action**
- Add multi-select queue rows and bulk action toolbar.
- Handle partial failures with explicit feedback banner.

**Depends on**
- Task G2.1

**Creates**
- Teacher-facing bulk review workflow.

**Verification**
- `npm run test -- src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts src/app/teacher/assignment/[id]/assignment-client-contract.test.ts`

**Done criteria**
- Teachers can apply review actions to multiple submissions from queue.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- src/app/api/teacher/intervention-impact-route-contract.test.ts src/app/api/submissions/bulk-review-route-contract.test.ts`
4. `npm run test:e2e -- e2e/analytics.spec.ts`

Manual verification:
- Perform parent brief/homework/review actions and verify impact card changes after outcome submissions.
- Execute a bulk review operation and validate mixed success/error reporting.
