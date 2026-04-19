# Math X-Ray Wave: Landing Audit + Full Design System Rollout

## 1. Executive summary

Math X-Ray currently has two visual products: a high-concept landing narrative and a utility-driven app shell. Both are individually strong, but together they create trust, consistency, and usability gaps.  
This spec defines one strict hybrid system: **landing stays expressive**, while teacher/student product flows become **clear, dense, and operational**—all under one shared token and component foundation, including **immediate dark mode rollout**.

Approved direction:
- One full-wave rollout across all pages (not phased).
- Hybrid visual strategy (expressive landing, functional tools).
- Dark mode implemented now across the full product.

---

## 2. Full landing page audit

### 2.1 Structural and strategic strengths

- `src/components/landing/landing-page.tsx` has a differentiated narrative pattern (horizontal stage + progress rail) that is product-specific and memorable.
- The 9-panel storyline has coherent pedagogical flow: problem -> process -> outcome -> CTA.
- Typography contrast (sans + serif accents) creates editorial character and helps section transitions.
- The progress rail and panel indexing support orientation on desktop.

### 2.2 Landing page weaknesses by section

#### Header and navigation
- **Issue:** Menu labels and aria strings are English (`Hero`, `Problem`, `Try the demo`, `Navigation`, `Close`) while product language is Estonian elsewhere.
- **Issue:** Menu interaction quality is good (focus trapping), but semantic/copy mismatch reduces perceived product maturity.
- **Issue:** Brand naming split (`Koosrada` in landing, `Matemaatika Röntgen` in app shell) without explicit relationship framing.

#### Hero panel
- **Issue:** Hero copy is English and abstract, while product operation pages are Estonian and concrete.
- **Issue:** No immediate conversion CTA in first viewport; CTA appears only in final panel.

#### Problem panel
- **Issue:** SVG contrast and dark block style are visually distinct but not system-aligned with rest of app surfaces.
- **Issue:** Content remains conceptual; no quick transition to “what teacher can do now.”

#### Process panels (5 steps)
- **Issue:** Strong narrative visual, but body copy can feel generic (“platform language”) vs product-native.
- **Issue:** No micro-proof signals (metrics, screenshots, real in-product outputs) to increase trust.

#### Outcome panel
- **Issue:** Good value articulation, but missing direct links to product actions from this panel.

#### CTA panel
- **Issue:** `Contact` link points to `/teacher/new`, which is a product action, not contact.
- **Issue:** CTA architecture is ambiguous: “Try demo” + “Teacher dashboard” + “Contact” without role-specific framing.

#### Progress rail and horizontal interaction
- **Issue:** Desktop-only rail is correct, but on mobile the story collapses into long vertical feed with no equivalent progress affordance.
- **Issue:** Progress rail aria label is English.

### 2.3 Visual consistency issues

- Landing uses bespoke CSS variables and palette; app pages use Tailwind utility palette (`zinc/indigo/emerald/rose`) with no shared semantic token contract.
- Radius, borders, shadows, and state styling are inconsistent across landing components and app components.
- `Card`, `Button`, `Input`, and page-level custom buttons are mixed patterns; states are not centralized.

### 2.4 Accessibility, responsiveness, and implementation concerns

- Inconsistent language harms readability and assistive predictability.
- Focus-visible behavior is present in many controls but not fully standardized in all custom controls.
- Mobile table-to-card parity is inconsistent across pages; some views adapt, some remain overflow-first.
- Repeated ad-hoc class strings create maintainability risk and drift.

---

## 3. Issues and errors by severity

| Severity | Area | Exact location | Problem | User impact |
|---|---|---|---|---|
| Critical | Language coherence | `landing-page.tsx`, `landing-menu.tsx`, `progress-rail.tsx`, `file-upload.tsx`, `teacher/new/page.tsx` | Mixed EN/ET UX copy | Trust drop, inconsistent product voice |
| Critical | System coherence | Landing CSS vs app utility styles | No shared token/component contract | Cross-page inconsistency, hard scaling |
| Major | CTA conversion | Landing CTA nav (`Contact` -> `/teacher/new`) | Mismatched label-action semantics | Confusion, conversion friction |
| Major | State consistency | Buttons/forms/cards across clients | Different hover/focus/error/loading behavior | Lower UX predictability |
| Major | Dark mode absence | Global | No dark mode implementation | Reduced accessibility/time-of-day usability |
| Major | Information parity | Teacher/student table/card patterns | Inconsistent responsive information mapping | Mobile comprehension loss |
| Medium | Mobile orientation | Landing progress model | No mobile equivalent to desktop progress rail | Reduced narrative control |
| Medium | Maintainability | Multiple clients with repeated inline class logic | Duplicate style/state logic | Slower iteration, more regressions |
| Minor | Semantic clarity | Some aria labels/landmark labels in EN | Localization inconsistency | Lower polish/accessibility quality |

---

## 4. Extracted design code / design system

### 4.1 Brand personality and art direction

- **Core tone:** “Analytical pedagogy with human warmth.”
- **Hybrid rule:**  
  - Landing: expressive, editorial, narrative.
  - Product pages: quiet, structured, high-legibility operational UI.

### 4.2 Design principles

1. Diagnose before decorate.
2. One semantic meaning -> one visual token.
3. Data-first hierarchy for teacher workflows.
4. Fast comprehension on mobile equals desktop.
5. Every interactive element has complete state behavior.

### 4.3 Layout and grid

- Desktop: 12 columns, max content width 1200px.
- Tablet: 8 columns.
- Mobile: 4 columns.
- Section spacing tokens: 24/32/48/64 based on hierarchy depth.

### 4.4 Spacing scale

`4, 8, 12, 16, 24, 32, 48, 64`

No arbitrary spacing outside scale unless explicitly documented.

### 4.5 Typography system

- Sans family for all functional UI.
- Serif reserved for landing hero/value statements only.
- Type tokens:
  - Display
  - H1
  - H2
  - H3
  - Body
  - Small
  - Caption

### 4.6 Color system (semantic)

Token groups:
- `bg`, `bg-muted`, `surface`, `surface-raised`, `surface-overlay`
- `text`, `text-muted`, `text-inverse`
- `border`, `border-strong`
- `brand`, `brand-hover`, `brand-active`, `on-brand`
- `success`, `warning`, `error`, each with fg/bg/border variants

Dark mode receives full parallel token set; no one-off overrides.

### 4.7 Surface, border, radius, shadow

- Radius scale: `sm=8`, `md=12`, `lg=16`, `xl=20`, `pill=999`.
- Border weights: default 1px, emphasis 2px.
- Elevation tiers:
  - Tier 0: flat surface
  - Tier 1: card raised
  - Tier 2: overlay/modal/menu

### 4.8 Components and states

All components must support:
- `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`
- plus `error` where applicable (inputs/forms/feedback)

Required primitives:
- `Button` (primary/secondary/ghost/destructive)
- `Input` + `Textarea`
- `Card`
- `Badge`
- `Table` (desktop) + `ResponsiveRowCard` (mobile parity)
- `SectionHeader`
- `StatCard`
- `EmptyState`
- `FeedbackBanner`

### 4.9 Navigation rules

- Landing nav style may differ visually, but interaction semantics match app shell:
  - visible focus ring
  - active/selected clarity
  - keyboard-navigable menus
- App shell has one canonical nav/link style set.

### 4.10 Motion and transition

- Micro-interactions: 120-200ms.
- Entrance animations: subtle and optional.
- Chart transitions: deterministic and restrained.
- Respect `prefers-reduced-motion` globally.

### 4.11 Content density

- Landing: low-medium density.
- Dashboards/analytics: medium density with strong sectioning.
- Forms: low density, high clarity.
- Drill-down views: medium-high density with clear progressive disclosure.

### 4.12 Responsive behavior

- Same information architecture across breakpoints.
- Desktop tables must have mobile equivalent with field parity.
- Avoid horizontal overflow as primary mobile strategy.

### 4.13 Accessibility standards

- WCAG AA color contrast baseline.
- Landmarks and heading hierarchy mandatory.
- Keyboard-first interaction complete.
- Error messages explicit and bound via `aria-describedby`.
- Sortable tables expose `aria-sort`.

---

## 5. Improved landing page strategy

### 5.1 Canonical role

Landing becomes the **reference implementation** of the design code’s narrative layer, while still sharing foundational tokens and component behavior with product pages.

### 5.2 Core changes

- Translate and rewrite all copy to high-quality Estonian.
- Add first-screen CTA pair:
  - “Proovi demot”
  - “Ava õpetaja töölaud”
- Fix CTA link semantics (`Contact` removed/replaced with true destination label).
- Add trust layer (what input, what output, why it helps) within narrative flow.
- Introduce mobile progress companion (lightweight section index chips).
- Align landing surfaces with semantic token palette (not isolated palette island).

---

## 6. Cross-page rollout strategy

### 6.1 Pages in scope (full wave)

- `/` landing
- `/teacher`
- `/teacher/new`
- `/teacher/assignment/[id]`
- `/teacher/assignment/[id]/analytics`
- `/teacher/cluster/[id]`
- `/submit/[id]`
- `/student/result/[id]`
- shared shell/nav/footer

### 6.2 Rollout order

1. Foundation tokens + dark mode infrastructure.
2. Primitive component hardening.
3. Landing redesign as canonical narrative reference.
4. Teacher flow normalization (dashboard -> assignment -> analytics -> cluster).
5. Student flow normalization (submit -> result).
6. Consistency and accessibility sweep.

---

## 7. Reusable component rules

- **Single source of truth** in `src/components/ui/*`.
- No page-specific duplicate button/input/card styling.
- Page clients may compose, not redefine primitive state styling.
- Tables must define mobile render strategy at creation time.
- Empty/loading/error blocks use shared presentation primitives.

---

## 8. Responsive behavior rules

- Breakpoints drive layout adaptation, not content omission.
- Charts: container-aware sizing, readable labels, scroll only as fallback.
- Forms: touch-target min 44px; label-input spacing fixed by token scale.
- Nav/actions: primary actions remain visible without horizontal scroll.

---

## 9. Accessibility corrections

- Unify ET localization for all user-visible strings.
- Normalize aria labels and heading structure across landing and app pages.
- Ensure all icon-only controls have accessible names.
- Ensure color is never sole status signal; pair with labels/badges/text.
- Standardize skeleton and loading semantics for assistive interpretation.

---

## 10. Frontend implementation improvements

- Extract repeated class patterns into reusable components/helpers.
- Replace ad-hoc action links/buttons with canonical variants.
- Consolidate state message rendering (`error/loading/success`) into common blocks.
- Reduce style drift by consuming semantic token utilities instead of raw palette literals.
- Ensure dark mode token usage is complete (no mixed hardcoded light colors).

---

## 11. Priority-based action plan

1. Foundation and tokens (including dark mode tokens and theme switching behavior).
2. Primitive component rewrite/hardening (`Button`, `Card`, `Input`, `Badge`, `Table` wrappers).
3. Landing full redesign and copy/system alignment.
4. Teacher pages consistency pass and hierarchy fixes.
5. Student pages consistency pass and feedback UX tightening.
6. Accessibility/responsive final pass with strict parity checks.

---

## 12. Non-negotiable rules

1. No mixed-language UX in core flows.
2. No new page-level styling that bypasses tokens/primitives.
3. No component without complete interaction states.
4. No table without mobile-equivalent information parity.
5. No dark-mode opt-outs unless explicitly documented as exception.
6. No ambiguous CTA labels; label must match destination/action exactly.
7. No accessibility “later” debt for focus, contrast, semantics, or keyboard use.

