# Plan D — Phase 3 Features 3–4 (Adaptive Homework + Real Sub-clustering)

## Goal

Teachers can push severity-aware homework to cluster members and inspect within-cluster sub-patterns derived from actual submission features.

## User needs solved

1. Teachers need actionable follow-through after identifying a misconception cluster.
2. Teachers need finer-grained pattern segmentation beyond one label per cluster.

## Features in this plan

3. **Adaptive Homework Push**
4. **Real Sub-clustering**

## Artifacts to create/modify

### Homework push
1. `src/lib/models/assignment-template.ts` (new)
2. `src/lib/models/personalized-assignment.ts` (new)
3. `src/lib/homework/engine.ts` (new)
4. `src/app/api/homework/push/route.ts` (new)
5. `src/app/api/homework/[token]/route.ts` (new)
6. `src/app/solve/[token]/page.tsx` (new)
7. `src/app/solve/[token]/solve-client.tsx` (new)
8. `src/app/api/homework/homework-route-contract.test.ts` (new)
9. `src/app/teacher/cluster/[id]/cluster-client.tsx` (modify)
10. `src/app/teacher/student/[studentKey]/student-client.tsx` (modify: homework tab)

### Sub-clustering
11. `src/lib/ai/sub-cluster-labels.ts` (new)
12. `src/lib/ai/cluster-submissions.ts` (modify)
13. `src/lib/models/cluster.ts` (modify: add subClusters)
14. `src/app/teacher/cluster/[id]/cluster-client.tsx` (modify: sub-cluster tabs)
15. `src/lib/ai/cluster-submissions.test.ts` (modify)
16. `src/app/teacher/cluster/[id]/cluster-client-contract.test.ts` (modify)

## Dependency map

- models (`assignment-template`, `personalized-assignment`) → none
- `src/lib/homework/engine.ts` → depends on models + cluster/submission reads
- homework routes → depend on engine
- solve page/client → depend on token route payload
- sub-cluster labels helper → none
- `cluster-submissions.ts` → depends on labels helper + updated cluster model
- cluster client updates → depend on both homework and sub-cluster route/model data

---

## Wave D1

### Task D1.1 — Add homework domain models + engine

**Files**
- `src/lib/models/assignment-template.ts`
- `src/lib/models/personalized-assignment.ts`
- `src/lib/homework/engine.ts`

**Action**
- Define templates and personalized assignment persistence.
- Implement severity-aware selection logic and secure token generation.

**Depends on**
- Plan B completion

**Creates**
- Backend core for adaptive homework push.

**Verification**
- `npm run typecheck`

**Done criteria**
- Engine can generate assignments for a cluster member list.

### Task D1.2 — Implement homework routes + contract tests

**Files**
- `src/app/api/homework/push/route.ts`
- `src/app/api/homework/[token]/route.ts`
- `src/app/api/homework/homework-route-contract.test.ts`

**Action**
- Add validated POST push route and public GET token route.
- Ensure error handling for invalid/expired/missing token.

**Depends on**
- Task D1.1

**Creates**
- API contract for homework distribution and retrieval.

**Verification**
- `npm run test -- src/app/api/homework/homework-route-contract.test.ts`

**Done criteria**
- Routes pass validation and return expected payload shapes.

---

## Wave D2

### Task D2.1 — Build solve page and integrate cluster push CTA

**Files**
- `src/app/solve/[token]/page.tsx`
- `src/app/solve/[token]/solve-client.tsx`
- `src/app/teacher/cluster/[id]/cluster-client.tsx`

**Action**
- Implement student solve experience for tokenized homework.
- Add cluster-page CTA to push assignments to selected students.

**Depends on**
- Task D1.2

**Creates**
- End-to-end homework push flow (teacher → student link).

**Verification**
- `npm run test -- src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`

**Done criteria**
- Push action returns links; solve page renders assigned exercises.

### Task D2.2 — Add homework tab in student profile

**Files**
- `src/app/teacher/student/[studentKey]/student-client.tsx`

**Action**
- Render homework history/status list tied to personalized assignments.

**Depends on**
- Task D1.1 and Plan C student profile

**Creates**
- Longitudinal visibility of assigned homework.

**Verification**
- `npm run test -- src/app/teacher/student/[studentKey]/student-client-contract.test.ts`

**Done criteria**
- Homework tab displays sent/responded statuses.

---

## Wave D3

### Task D3.1 — Extend clustering backend with sub-clusters

**Files**
- `src/lib/ai/sub-cluster-labels.ts`
- `src/lib/ai/cluster-submissions.ts`
- `src/lib/models/cluster.ts`

**Action**
- Implement within-cluster partitioning with minimum member threshold.
- Persist labeled subClusters with representative evidence.

**Depends on**
- Plan B completion

**Creates**
- Real sub-cluster computation and storage.

**Verification**
- `npm run test -- src/lib/ai/cluster-submissions.test.ts`

**Done criteria**
- Clusters with sufficient volume produce multiple subClusters.

### Task D3.2 — Render sub-cluster tabs on cluster UI

**Files**
- `src/app/teacher/cluster/[id]/cluster-client.tsx`
- `src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`

**Action**
- Add tabbed view for sub-clusters with label, evidence, and remediation hints.
- Preserve fallback to single-view when sub-clusters absent.

**Depends on**
- Task D3.1

**Creates**
- Teacher-visible sub-pattern exploration UI.

**Verification**
- `npm run test -- src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`

**Done criteria**
- UI shows sub-cluster tabs only when data exists.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- src/app/api/homework/homework-route-contract.test.ts src/lib/ai/cluster-submissions.test.ts`
4. `npm run test:e2e -- e2e/cluster-detail.spec.ts`

Manual verification:
- Push homework from cluster page, open solve link, submit response.
- Cluster detail displays sub-cluster tabs for large clusters.
