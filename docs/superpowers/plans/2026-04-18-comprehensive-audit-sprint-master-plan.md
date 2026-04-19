# Math X-Ray — Comprehensive Audit + Refactor + 10-Feature Sprint (Master Plan)

## 1) Goal (what must be TRUE when complete)

When this sprint is complete:

1. A full codebase audit report exists and covers **architecture, per-source-file code quality, AI-slop findings with severity, security/dependency risk, and performance bottlenecks**.
2. High-severity findings are refactored according to the non-negotiable rules (dead code removed, magic values centralized, duplicated logic extracted, structured error handling, TODO/FIXME/HACK policy enforced).
3. Exactly **10 new product features** are delivered end-to-end (model/service/API/UI + validation + error handling + at least one test stub each).
4. The codebase passes lint, typecheck, tests, and targeted e2e checks.

---

## 2) Scope decomposition rationale

The request is too large for a single 5–6 task plan. It is decomposed into 7 dependency-ordered plans:

1. **Plan A** — Phase 1 full audit deliverables
2. **Plan B** — Phase 2 refactor/slop elimination foundations
3. **Plan C** — Features 1–2 (Student Journey + Parent Brief)
4. **Plan D** — Features 3–4 (Adaptive Homework + Sub-clustering)
5. **Plan E** — Features 5–6 (Live Mode + Curriculum Map)
6. **Plan F** — Features 7–8 (Topic Notebook + Voice Capture)
7. **Plan G** — Features 9–10 (Intervention Impact + Bulk Review)

---

## 3) Feature set (exactly 10)

1. **Student Journey Profile** — longitudinal student understanding page.
2. **Parent Brief Generator** — teacher-facing concise parent summary generation.
3. **Adaptive Homework Push** — cluster-targeted assignments with tokenized student solve link.
4. **Real Sub-clustering** — within-misconception sub-pattern detection.
5. **Live Classroom Mode** — projection-safe live pulse for active assignment.
6. **Curriculum Outcome Coverage** — PRÕK-aligned mastery coverage section.
7. **Topic Collaboration Notebook** — shared topic notes per organization.
8. **Voice Explanation Capture** — audio upload + transcript-aware analysis signal.
9. **Intervention Impact Attribution** — teacher action → subsequent outcome link.
10. **Bulk Review Queue Actions** — apply review actions to multiple submissions safely.

---

## 4) Plan files (artifacts)

- `docs/superpowers/plans/2026-04-18-phase-1-audit-plan.md`
- `docs/superpowers/plans/2026-04-18-phase-2-refactor-plan.md`
- `docs/superpowers/plans/2026-04-18-phase-3-plan-c-student-journey-parent-brief.md`
- `docs/superpowers/plans/2026-04-18-phase-3-plan-d-homework-subclusters.md`
- `docs/superpowers/plans/2026-04-18-phase-3-plan-e-live-curriculum.md`
- `docs/superpowers/plans/2026-04-18-phase-3-plan-f-notebook-voice.md`
- `docs/superpowers/plans/2026-04-18-phase-3-plan-g-impact-bulk-review.md`

---

## 5) Dependency-ordered execution waves

### Wave M1
- Plan A

### Wave M2
- Plan B (depends on Plan A findings)

### Wave M3 (parallel)
- Plan C (depends on B)
- Plan E (depends on B)

### Wave M4 (parallel)
- Plan D (depends on B)
- Plan F (depends on B)

### Wave M5
- Plan G (depends on C and D; uses action streams from parent briefs/homework/review)

---

## 6) Global verification gate (end-to-end)

After all seven plans are implemented:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run test:e2e -- e2e/smoke.spec.ts e2e/analytics.spec.ts e2e/cluster-detail.spec.ts`

Manual acceptance checklist:

- Audit report includes sections 1.1–1.5 and per-file findings index.
- Phase 2 diff report shows side-by-side before/after for every applied refactor.
- All 10 features are reachable via UI/API and have at least one corresponding test stub.
