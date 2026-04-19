# Plan C — Phase 3 Features 1–2 (Student Journey + Parent Brief)

## Goal

Teachers can open a dedicated student trajectory page and generate concise, evidence-linked parent briefs from that context, with API validation and persisted history.

## User needs solved

1. Teachers need a single student-centric page instead of hunting across assignment screens.
2. Teachers need fast parent communication generated from real evidence.

## Features in this plan

1. **Student Journey Profile**
2. **Parent Brief Generator**

## Artifacts to create/modify

### Student Journey
1. `src/lib/student-profile/engine.ts` (new)
2. `src/app/api/teacher/student/[studentKey]/route.ts` (new)
3. `src/app/teacher/student/[studentKey]/page.tsx` (new)
4. `src/app/teacher/student/[studentKey]/student-client.tsx` (new)
5. `src/app/teacher/student/[studentKey]/student-client-contract.test.ts` (new)
6. `src/app/teacher/super-dashboard-client.tsx` (modify: link student rows)
7. `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx` (modify: link student rows)

### Parent Brief
8. `src/lib/models/parent-brief.ts` (new)
9. `src/lib/ai/parent-brief-prompt.ts` (new)
10. `src/app/api/parent-brief/generate/route.ts` (new)
11. `src/components/teacher/parent-brief-modal.tsx` (new)
12. `src/app/teacher/student/[studentKey]/student-client.tsx` (modify: briefs tab)
13. `src/app/teacher/super-dashboard-client.tsx` (modify: action button)
14. `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx` (modify: action button)
15. `src/lib/teacher-copy.ts` (modify: parent-brief copy helpers)
16. `src/app/api/teacher/student/student-profile-route-contract.test.ts` (new)
17. `src/app/api/parent-brief/parent-brief-route-contract.test.ts` (new)

## Dependency map

- `src/lib/student-profile/engine.ts` → none
- student profile API route → depends on profile engine
- student profile page/client → depends on API shape
- `src/lib/models/parent-brief.ts` + `src/lib/ai/parent-brief-prompt.ts` → none
- parent brief API → depends on model + prompt + teacher context
- parent brief modal and UI actions → depend on parent brief API
- tests → depend on corresponding implementations

---

## Wave C1

### Task C1.1 — Build student profile aggregation backend

**Files**
- `src/lib/student-profile/engine.ts`
- `src/app/api/teacher/student/[studentKey]/route.ts`
- `src/app/api/teacher/student/student-profile-route-contract.test.ts`

**Action**
- Implement aggregation for submissions, misconception history, and intervention summary by `studentKey` and teacher/org scope.
- Add request validation for `studentKey` path and error responses.

**Depends on**
- Plan B completion

**Creates**
- Backend contract for student profile data.

**Verification**
- `npm run test -- src/app/api/teacher/student/student-profile-route-contract.test.ts`

**Done criteria**
- Route returns scoped profile payload with timeline and history arrays.

### Task C1.2 — Create student journey page and client

**Files**
- `src/app/teacher/student/[studentKey]/page.tsx`
- `src/app/teacher/student/[studentKey]/student-client.tsx`
- `src/app/teacher/student/[studentKey]/student-client-contract.test.ts`

**Action**
- Implement tabbed profile UI: summary, submissions, misconceptions, homework placeholder, parent briefs placeholder.
- Add resilient loading/error states.

**Depends on**
- Task C1.1

**Creates**
- End-user student journey interface.

**Verification**
- `npm run test -- src/app/teacher/student/[studentKey]/student-client-contract.test.ts`

**Done criteria**
- Profile route renders and displays core timeline data.

---

## Wave C2

### Task C2.1 — Implement parent brief data/model/API

**Files**
- `src/lib/models/parent-brief.ts`
- `src/lib/ai/parent-brief-prompt.ts`
- `src/app/api/parent-brief/generate/route.ts`
- `src/app/api/parent-brief/parent-brief-route-contract.test.ts`

**Action**
- Add parent brief schema with teacher/org/student/source submission references.
- Build generation route with rate limiting (1/student/teacher/60s), validation, and persistence.

**Depends on**
- Task C1.1

**Creates**
- Parent brief generation and storage capability.

**Verification**
- `npm run test -- src/app/api/parent-brief/parent-brief-route-contract.test.ts`

**Done criteria**
- API returns generated brief and writes model record.

### Task C2.2 — Add parent brief UI integration

**Files**
- `src/components/teacher/parent-brief-modal.tsx`
- `src/app/teacher/student/[studentKey]/student-client.tsx`
- `src/app/teacher/super-dashboard-client.tsx`

**Action**
- Add “Generate parent brief” action and modal with copy-to-clipboard affordance.
- Render parent brief history in student profile tab.

**Depends on**
- Task C2.1

**Creates**
- Teacher-facing end-to-end parent brief flow.

**Verification**
- `npm run test -- src/app/teacher/student/[studentKey]/student-client-contract.test.ts`

**Done criteria**
- Teacher can generate and copy brief; history visible on profile.

### Task C2.3 — Link student names from existing dashboards

**Files**
- `src/app/teacher/super-dashboard-client.tsx`
- `src/app/teacher/assignment/[id]/analytics/analytics-client.tsx`

**Action**
- Convert student-name cells to links to `/teacher/student/[studentKey]`.
- Preserve current sorting/filter behavior.

**Depends on**
- Task C1.2

**Creates**
- Navigation continuity into student journey.

**Verification**
- `npm run test -- src/app/teacher/super-dashboard-client-contract.test.ts src/app/teacher/assignment/[id]/analytics/analytics-client-contract.test.ts`

**Done criteria**
- Every teacher-facing student row links to profile.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- src/app/api/teacher/student/student-profile-route-contract.test.ts src/app/api/parent-brief/parent-brief-route-contract.test.ts`

Manual verification:
- Navigate from dashboard student row → student profile.
- Generate parent brief and verify it appears in profile history.
