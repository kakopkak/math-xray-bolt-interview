# Math X-Ray Bolt Interview Deck

This repository now uses a **Slidev-first presentation workflow** for a 5-minute Bolt interview response built around one bounded feature from Math X-Ray: generating the **next whole-class move** from clustered student mistakes.

The live product used as the truth source for framing and screenshots is here:

- Landing page: [koosrada.tech](https://koosrada.tech/)
- Teacher dashboard: [koosrada.tech/teacher](https://koosrada.tech/teacher)

## What is in this repo

- `slides.md` — the full Slidev presentation source, including speaker notes
- `PROMPT.md` — the source brief and deck-generation constraints
- `public/images/` — live screenshots plus the workflow diagram asset

The repo still retains the published Math X-Ray application source, but the **primary interview artifact at the repo root is now the Slidev deck**.

## Quick start

```bash
pnpm install
pnpm dev
```

Slidev will open a local presentation server, usually at `http://localhost:3030`.

## Export

```bash
pnpm build
pnpm export
```

Notes:

- PDF is the primary export target for this interview deck.
- PPTX export is possible through Slidev, but it is image-based rather than fully editable.

## Fast customization

Before recording, update:

1. `[YOUR NAME]`
2. `[YOUR ROLE]`
3. `[YOUR RESULT]`
4. Any personal build-process details that should reflect your real workflow

## Deck goals

- Keep the story small and credible
- Show a real problem, not a startup pitch
- Explain where AI helps and where teacher judgment still matters
- Be honest about failure modes and what comes next

## Sources used in the deck

- Public product pages from [koosrada.tech](https://koosrada.tech/)
- Public teacher dashboard at [koosrada.tech/teacher](https://koosrada.tech/teacher)
- Public code and repo-evident behavior from the Math X-Ray codebase
- Reference Slidev workflow from `jn1707/copilot-slidev-presentations`
