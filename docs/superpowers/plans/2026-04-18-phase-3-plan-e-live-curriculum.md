# Plan E — Phase 3 Features 5–6 (Live Mode + Curriculum Map)

## Goal

Teachers can run an anonymized live assignment pulse during class and inspect outcome-level curriculum mastery coverage aligned to topic taxonomy.

## User needs solved

1. Teachers need real-time classroom signal during active work.
2. Teachers need curriculum-outcome framing for reporting and planning.

## Features in this plan

5. **Live Classroom Mode**
6. **Curriculum Outcome Coverage**

## Artifacts to create/modify

### Live mode
1. `src/app/api/teacher/assignment/[id]/live-pulse/route.ts` (new)
2. `src/app/teacher/live/[assignmentId]/page.tsx` (new)
3. `src/app/teacher/live/[assignmentId]/live-client.tsx` (new)
4. `src/app/teacher/assignment/[id]/assignment-client.tsx` (modify)
5. `src/app/api/teacher/live-pulse-route-contract.test.ts` (new)

### Curriculum map
6. `src/lib/curriculum/map.ts` (new)
7. `src/lib/curriculum/mastery.ts` (new)
8. `src/app/teacher/super-dashboard-sections/curriculum.tsx` (new)
9. `src/app/api/teacher/curriculum-report/route.ts` (new)
10. `src/app/teacher/super-dashboard-client.tsx` (modify)
11. `src/app/api/teacher/curriculum-report-route-contract.test.ts` (new)

## Dependency map

- live pulse route → depends on assignment/submission data models
- live client/page → depends on live pulse route contract
- assignment client link/button → depends on live route existence
- curriculum map + mastery utils → none
- curriculum report API → depends on mastery utils
- super-dashboard curriculum section → depends on mastery payload

---

## Wave E1

### Task E1.1 — Implement live pulse API and projection client

**Files**
- `src/app/api/teacher/assignment/[id]/live-pulse/route.ts`
- `src/app/teacher/live/[assignmentId]/page.tsx`
- `src/app/teacher/live/[assignmentId]/live-client.tsx`

**Action**
- Add lightweight, polling-oriented endpoint with anonymized student statuses.
- Build projection-safe page with large typography and no student names.

**Depends on**
- Plan B completion

**Creates**
- End-to-end live classroom mode.

**Verification**
- `npm run test -- src/app/api/teacher/live-pulse-route-contract.test.ts`

**Done criteria**
- Live page updates using pulse endpoint with anonymized rows.

### Task E1.2 — Wire live mode entry point from assignment page

**Files**
- `src/app/teacher/assignment/[id]/assignment-client.tsx`

**Action**
- Add “Start live session” CTA linking to live mode route.

**Depends on**
- Task E1.1

**Creates**
- Discoverability from assignment workflow.

**Verification**
- `npm run test -- src/app/teacher/assignment/[id]/assignment-client-contract.test.ts`

**Done criteria**
- Assignment page exposes working link to live mode.

---

## Wave E2

### Task E2.1 — Add curriculum map config + mastery aggregator

**Files**
- `src/lib/curriculum/map.ts`
- `src/lib/curriculum/mastery.ts`
- `src/app/api/teacher/curriculum-report/route.ts`

**Action**
- Define static topic→outcome mapping with explicit SME-validation note.
- Aggregate outcome-level mastery from submission analytics.
- Add printable report route.

**Depends on**
- Plan B completion

**Creates**
- Curriculum coverage computation and export API.

**Verification**
- `npm run test -- src/app/api/teacher/curriculum-report-route-contract.test.ts`

**Done criteria**
- API returns outcome list with mastery fractions.

### Task E2.2 — Render curriculum section in super dashboard

**Files**
- `src/app/teacher/super-dashboard-sections/curriculum.tsx`
- `src/app/teacher/super-dashboard-client.tsx`

**Action**
- Integrate curriculum section inside deep-analysis area with export control.

**Depends on**
- Task E2.1

**Creates**
- Teacher-facing curriculum coverage view.

**Verification**
- `npm run test -- src/app/teacher/super-dashboard-client-contract.test.ts`

**Done criteria**
- Curriculum outcome cards appear with mastery fractions and export action.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- src/app/api/teacher/live-pulse-route-contract.test.ts src/app/api/teacher/curriculum-report-route-contract.test.ts`
4. `npm run test:e2e -- e2e/analytics.spec.ts`

Manual verification:
- Launch live mode and confirm no student-identifying names appear.
- Confirm curriculum section displays only relevant outcomes.
