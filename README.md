# Math X-Ray

AI-assisted misconception analytics for math classrooms. **Live demo:** https://koosrada.tech

## What it does (5-step pipeline)

1. **Capture submissions**: students submit typed, photo, or voice-supported math work.
2. **Extract solution steps**: the pipeline parses step-by-step reasoning from raw input.
3. **Classify misconceptions**: each step is labeled for correctness and misconception code.
4. **Cluster class patterns**: submissions are grouped by dominant misconception and summarized for teacher action.
5. **Generate remediation**: the app proposes targeted exercises and next-move interventions.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string used by app/API and scripts. |
| `OPENAI_API_KEY` | Yes | OpenAI API key for extraction/classification/remediation/next-move generation. |
| `NEXTAUTH_SECRET` | Yes | Session/JWT signing secret for NextAuth. |
| `GOOGLE_CLIENT_ID` | Yes (Google auth enabled) | OAuth client ID for teacher login. |
| `GOOGLE_CLIENT_SECRET` | Yes (Google auth enabled) | OAuth client secret for teacher login. |
| `DEMO_SEED_TOKEN` | Recommended | Shared token for demo seed endpoint (`x-demo-token` header). |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL used for metadata and app links. |
| `ALLOW_DEMO_AUTH` | Optional (`0`/`1`) | Enables demo auth fallback for teacher/student demo flows. |
| `ALLOW_DEMO_SEED` | Optional (`0`/`1`) | Allows seeding in production when explicitly enabled. |
| `NEXT_PUBLIC_FEATURE_SPAWN` | Optional (`0`/`1`) | Frontend feature flag for next-move spawn UX. |

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | MongoDB, Mongoose |
| AI | OpenAI SDK |
| Auth | NextAuth (Google provider) |
| UI | Tailwind CSS v4, Recharts |
| E2E testing | Playwright |
| Runtime | Node.js 22 |

## NPM scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start local Next.js development server. |
| `npm run build` | Production build. |
| `npm run start` | Run built production server. |
| `npm run lint` | Run ESLint checks. |
| `npm run typecheck` | Run TypeScript type-check (`tsc --noEmit`). |
| `npm run test` | Run unit/contract tests under `src/**/*.test.ts`. |
| `npm run seed` | Seed deterministic demo assignment dataset. |
| `npm run verify:parity` | Run parity verification script in `scripts/verify-parity.ts`. |
| `npm run backfill:context` | Backfill teacher/org/class context fields for legacy records. |
| `npm run test:e2e` | Run Playwright e2e suite. |

## Routes

### Teacher and admin routes

| Route | Purpose |
| --- | --- |
| `/teacher` | Teacher home/dashboard. |
| `/teacher/new` | Create assignment. |
| `/teacher/assignment/[id]` | Assignment detail and cluster summary. |
| `/teacher/assignment/[id]/analytics` | Assignment analytics dashboard. |
| `/teacher/cluster/[id]` | Cluster detail and remediation view. |
| `/teacher/student/[studentKey]` | Student profile view for teacher. |
| `/teacher/live/[assignmentId]` | Live pulse classroom view. |
| `/teacher/topic/[topic]` | Topic-level teacher notebook view. |
| `/admin/invites` | Admin invite management. |

### Student/demo routes

| Route | Purpose |
| --- | --- |
| `/submit/[id]` | Student submission flow. |
| `/student/result/[id]` | Student result and remediation view. |
| `/solve/[token]` | Personalized homework solve entry. |
| `/demo` | Demo launch experience. |

### Shared app routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing + demo CTA landing page. |
| `/login` | Authentication page. |

### API routes

| Route | Purpose |
| --- | --- |
| `POST /api/admin/invites` | Create teacher/admin invite. |
| `GET/POST /api/admin/sweep` | Inspect/execute admin recovery sweep jobs. |
| `GET /api/health` | Health check endpoint. |
| `GET /api/auth/[...nextauth]` | NextAuth session/auth handlers (GET/POST). |
| `GET /api/clusters/[id]` | Get cluster detail + submission payload. |
| `POST /api/clusters/[id]/remediate` | Generate remediation exercises for a cluster. |
| `POST /api/assignments` | Create assignment. |
| `POST /api/assignments/seed` | Seed deterministic demo dataset. |
| `GET /api/assignments/[id]` | Assignment detail endpoint. |
| `POST /api/assignments/[id]/submit` | Create submission and trigger analysis pipeline. |
| `GET /api/assignments/[id]/progress` | Assignment processing progress summary. |
| `POST /api/assignments/[id]/cluster` | Trigger clustering for completed submissions. |
| `GET /api/assignments/[id]/clusters` | List assignment clusters. |
| `GET /api/assignments/[id]/submissions` | List assignment submissions. |
| `GET /api/assignments/[id]/analytics` | Assignment analytics payload. |
| `GET /api/assignments/[id]/next-move` | Generate next-move recommendation. |
| `POST /api/assignments/[id]/next-move/spawn` | Spawn assignment from next-move recommendation. |
| `GET /api/teacher/assignment/[id]/live-pulse` | Live classroom pulse stream summary. |
| `GET /api/teacher/super-dashboard` | Teacher super-dashboard dataset. |
| `GET /api/teacher/super-dashboard/export` | CSV export for super-dashboard at-risk students. |
| `GET /api/teacher/roster` | Teacher roster endpoint. |
| `GET /api/teacher/student/[studentKey]` | Teacher view for one student profile. |
| `GET /api/teacher/intervention-impact` | Intervention impact analytics. |
| `GET/POST /api/teacher/interventions` | List/create interventions. |
| `PATCH/DELETE /api/teacher/interventions/[id]` | Update/delete intervention. |
| `GET /api/teacher/curriculum-report` | Curriculum report data. |
| `GET/PUT /api/teacher/notebook/[topic]` | Teacher notebook read/write by topic. |
| `POST /api/submissions/bulk-review` | Bulk teacher review updates. |
| `GET /api/submissions/[id]` | Submission detail endpoint. |
| `GET /api/submissions/[id]/stream` | SSE stream for live submission processing state. |
| `POST /api/submissions/[id]/review` | Teacher review/override on submission. |
| `POST /api/submissions/[id]/retry` | Retry AI analysis for submission. |
| `POST /api/submissions/[id]/sweep` | Submission-level sweep/recovery operation. |
| `POST /api/homework/push` | Push/create personalized homework. |
| `GET /api/homework/[token]` | Resolve homework by share token. |
| `POST /api/parent-brief/generate` | Generate parent brief from student data. |

## Design system contract (summary)

- **Theme tokens:** UI consumes semantic CSS variables from `src/app/globals.css` (`--color-*`) for light/dark parity.
- **Shell contract:** `AppShell` wraps non-landing routes; landing (`/`) intentionally bypasses shell.
- **Theme persistence:** preference key is `math-xray-theme`; `theme-init` sets `html[data-theme]` before hydration.
- **Teacher/student UX parity:** `ThemeToggle` (`aria-label="Värviteema"`) remains available on teacher/student surfaces.
- **Regression coverage:** `e2e/design-system-rollout.spec.ts` and `e2e/smoke.spec.ts` protect key visual and navigation behavior.

## Backfill instructions

Use this when migrating legacy data missing teacher/org/class context fields.

```bash
# dry run (no writes)
npm run backfill:context -- --dry-run

# apply updates
npm run backfill:context
```
