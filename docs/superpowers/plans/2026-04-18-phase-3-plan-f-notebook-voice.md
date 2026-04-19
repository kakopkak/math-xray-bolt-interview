# Plan F — Phase 3 Features 7–8 (Topic Notebook + Voice Capture)

## Goal

Teachers in the same organization can share topic-specific notes, and students can submit optional voice reasoning that enriches analysis confidence/divergence signals.

## User needs solved

1. Teachers need cross-class knowledge sharing by topic.
2. Students need multimodal explanation paths when written work alone is ambiguous.

## Features in this plan

7. **Topic Collaboration Notebook**
8. **Voice Explanation Capture**

## Artifacts to create/modify

### Topic notebook
1. `src/lib/models/topic-notebook.ts` (new)
2. `src/app/api/teacher/notebook/[topic]/route.ts` (new)
3. `src/components/teacher/topic-notebook.tsx` (new)
4. `src/app/teacher/topic/[topic]/page.tsx` (new)
5. `src/app/teacher/cluster/[id]/cluster-client.tsx` (modify)
6. `src/app/api/teacher/notebook-route-contract.test.ts` (new)

### Voice capture
7. `src/lib/ai/whisper.ts` (new)
8. `src/lib/models/submission.ts` (modify)
9. `src/app/solve/[token]/solve-client.tsx` (modify)
10. `src/app/api/assignments/[id]/submit/route.ts` (modify)
11. `src/lib/ai/pipeline.ts` (modify)
12. `src/lib/intelligence/submission-intelligence.ts` (modify)
13. `src/components/ui/trust-tag.tsx` (modify)
14. `src/lib/intelligence/submission-intelligence.test.ts` (modify)
15. `src/app/solve/voice-capture-contract.test.ts` (new)

## Dependency map

- notebook model → none
- notebook route → depends on model
- notebook UI/page integration → depends on route
- whisper client → none
- submission model voice fields → none
- solve client voice capture → depends on model/API acceptance
- pipeline/intelligence updates → depend on whisper output and model fields
- trust tag voice variant → depends on new intelligence flags

---

## Wave F1

### Task F1.1 — Implement topic notebook backend and contracts

**Files**
- `src/lib/models/topic-notebook.ts`
- `src/app/api/teacher/notebook/[topic]/route.ts`
- `src/app/api/teacher/notebook-route-contract.test.ts`

**Action**
- Add org-scoped notebook model and GET/POST route.
- Enforce safe markdown handling constraints at API boundary.

**Depends on**
- Plan B completion

**Creates**
- Shared topic notebook persistence and API.

**Verification**
- `npm run test -- src/app/api/teacher/notebook-route-contract.test.ts`

**Done criteria**
- Teachers in same org can read/write topic notes.

### Task F1.2 — Add notebook UI in cluster and topic pages

**Files**
- `src/components/teacher/topic-notebook.tsx`
- `src/app/teacher/topic/[topic]/page.tsx`
- `src/app/teacher/cluster/[id]/cluster-client.tsx`

**Action**
- Render notebook sidebar in cluster page and dedicated topic page.

**Depends on**
- Task F1.1

**Creates**
- Teacher-visible collaboration entry points.

**Verification**
- `npm run test -- src/app/teacher/cluster/[id]/cluster-client-contract.test.ts`

**Done criteria**
- Notebook entries visible and addable from cluster context.

---

## Wave F2

### Task F2.1 — Add voice capture data model + whisper utility

**Files**
- `src/lib/ai/whisper.ts`
- `src/lib/models/submission.ts`
- `src/app/api/assignments/[id]/submit/route.ts`

**Action**
- Extend submission schema for audio URL/transcript/verbal reasoning fields.
- Accept optional audio payload and transcribe via whisper helper.
- Enforce max size and validation errors.

**Depends on**
- Plan D solve-route groundwork

**Creates**
- Ingestion support for voice reasoning.

**Verification**
- `npm run typecheck`

**Done criteria**
- Submit route accepts optional voice path and stores transcript when available.

### Task F2.2 — Update solve client and pipeline/intelligence consumers

**Files**
- `src/app/solve/[token]/solve-client.tsx`
- `src/lib/ai/pipeline.ts`
- `src/lib/intelligence/submission-intelligence.ts`

**Action**
- Add record/stop/re-record controls and upload path.
- Extend intelligence calculation for written-vs-verbal divergence signal.

**Depends on**
- Task F2.1

**Creates**
- End-to-end voice-enhanced analysis path.

**Verification**
- `npm run test -- src/lib/intelligence/submission-intelligence.test.ts src/app/solve/voice-capture-contract.test.ts`

**Done criteria**
- Voice path creates divergence signal where applicable.

### Task F2.3 — Surface voice trust cue in UI

**Files**
- `src/components/ui/trust-tag.tsx`
- `src/app/teacher/cluster/[id]/cluster-client.tsx`

**Action**
- Add trust-tag variant indicating verbal explanation available.
- Show cue in teacher views where useful.

**Depends on**
- Task F2.2

**Creates**
- Visible multimodal trust signal.

**Verification**
- `npm run test -- src/components/ui/trust-tag.test.ts`

**Done criteria**
- Trust tag displays voice variant without regressing existing states.

---

## Plan-level verification

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- src/app/api/teacher/notebook-route-contract.test.ts src/lib/intelligence/submission-intelligence.test.ts`

Manual verification:
- Add notebook entry as one teacher and verify visibility for same-org teacher.
- Record short voice explanation in solve flow and confirm transcript handling.
