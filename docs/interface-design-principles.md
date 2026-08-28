# Interface Design Principles — Vocabulary Learning App

> **Single source of truth for UI/UX.** Read this document before building,
> updating, or reviewing any screen, layout, or component.
>
> - Scope: every user-facing surface (views, components, styles).
> - Codebase anchors: `src/style/index.css` (tokens + layout helpers),
>   `src/App.vue` (shell), `src/components/**`, `src/views/**`.
> - Related docs: `docs/architecture.md` (§6 routing, §8 responsive rules),
>   `docs/business-rules.md` (BR-60…75), `docs/analysis.md` (FR-X03/X04),
>   `AGENTS.md` (engineering conventions).
> - Status: v1.0 — apply to all new work; refactor toward these rules when
>   touching existing UI, but do not rewrite working screens speculatively.

---

## 1. Purpose & how to use

This document defines **what good UI means for this app** and **how to achieve
it consistently**. It exists so that any screen built today looks and behaves
like it belongs to the same product as every other screen.

- **Building a new screen?** → start at §12 (page patterns) + §14 (checklist).
- **Building a new component?** → start at §7 (component catalog) + §14.
- **Changing colors/spacing/motion?** → §3 (tokens) + §9 (color rules).
- **Debugging layout on mobile?** → §4 (layout architecture) + §5 (patterns).

The system uses **Bootstrap 5.3** as the base framework (grid, utilities,
components) plus a thin layer of app tokens and helpers in
`src/style/index.css`. Custom CSS is **scoped to components** and must only
consume tokens.

---

## 2. Core principles (non-negotiable)

| # | Principle | Meaning in practice |
|---|-----------|---------------------|
| P1 | **Responsive is a requirement, not a feature** | Every screen is designed for phone *and* desktop in the same component. Test both before done (§14). |
| P2 | **Fit the viewport** | No unnecessary horizontal or vertical overflow. Learning screens never page-scroll; they scroll *inside* `.learning-stage`. |
| P3 | **Viewport-aware, never fixed** | Use `svh` → `dvh` (never bare `vh`), `env(safe-area-inset-*)`, and CSS variables (`--app-header-h`). No fixed pixel heights that break when mobile browser chrome appears/disappears. |
| P4 | **Mobile = one column, desktop = purposeful multi-column** | Small screens: a single vertical stack that fits. Large screens: rails + a **horizontally centered** learning column. |
| P5 | **One theme, zero hardcoded colors** | All colors come from tokens in `src/style/index.css` (`--app-*`, `--bs-*`). A hex literal in a component is a bug. |
| P6 | **Reuse before build** | Check §7 catalog first. Extract a shared component after the second duplication, never before the first. |
| P7 | **Minimalist, modern, alive** | Flat surfaces, hairline borders, soft shadows, generous whitespace, restrained but noticeable motion. |
| P8 | **One primary action per screen** | Exactly one `btn-primary` CTA; everything else is outline/ghost/muted. Primary vs secondary must be obvious at a glance. |
| P9 | **Touch ≥ 44px, keyboard parity** | Every interactive target ≥ 44px; every mouse action has a keyboard equivalent (FR-X04). |
| P10 | **Motion with meaning** | Animate state change, not decoration: 100–450ms, transform/opacity only, respect `prefers-reduced-motion`. |

---

## 3. Design tokens

**Source of truth:** `:root` in `src/style/index.css`. Never redefine tokens
locally; extend them there (and update this doc) when genuinely needed.

### 3.1 Color

| Token | Value | Use |
|-------|-------|-----|
| `--app-brand` | `#6f42c1` | Brand + all primary actions, selected states, focus accents. Mapped to `--bs-primary`. |
| `--app-brand-rgb` | `111, 66, 193` | For `rgba(var(--app-brand-rgb), x)` tints. |
| `--app-brand-contrast` | `#fff` | Text/icons on brand backgrounds. |
| `--app-bg` | `#f8f9fa` | Page background, backdrops behind scrolling content. |
| `--app-surface` | `#ffffff` | Cards, panels, modals, sticky action bars. |
| `--app-border` | `#dee2e6` | Hairline borders on cards, list rows, dividers. |
| `--app-text-muted` | `#6c757d` | Secondary text, hints, meta (also `--bs-secondary`). |
| `--app-header-h` | `56px` | Height of the sticky header; used by `.learning-shell` math. |
| `--app-radius` | `0.5rem` | Default corner radius. |

Semantic colors (Bootstrap defaults, **do not redefine**): `success` = correct /
learned / progress; `danger` = wrong / destructive / validation; `warning` +
`text-dark` = pending / re-learn; `secondary`, `text-bg-light` = neutral meta
badges (type, topic, level).

### 3.2 Typography

- **Font stack** (global, `body`): `system-ui, -apple-system, 'Segoe UI',
  Roboto, 'Helvetica Neue', Arial, sans-serif`. Never load custom web fonts.
- **Scale** (Bootstrap classes only): page title `h3` · section/card title
  `h5` · body `1rem` · meta/hints `.small` + `.text-muted` · hero content
  (flashcard front) `display-5 fw-semibold`.
- **Emphasis**: `fw-semibold` (600) for key values; `fw-bold` only for marks.
- **Text overflow**: single-line lists use `text-truncate`; content that must
  wrap (options, prompts) uses `overflow-wrap: anywhere`. Any flex child that
  can shrink needs `min-width: 0`.

### 3.3 Spacing, radius, elevation

- **Spacing grid**: 4px base via Bootstrap utilities (`m-*`, `p-*`, `gap-*`).
  Panel padding `1rem`–`1.25rem`; section rhythm `mb-3` / `mb-4`.
- **Radius**: `--app-radius` (0.5rem) for controls; `0.6–0.9rem` for panels and
  option buttons; `50%` for letter circles; badges as-is.
- **Elevation — exactly three levels:**
  1. Card rest: `0 6px 18px rgba(0,0,0,0.08)`
  2. Card hover lift: `0 4px 12px rgba(0,0,0,0.08)` + `translateY(-2px)`
  3. Modal: `0 18px 50px rgba(0,0,0,0.25)`
  Never heavy/dark shadows; hairline borders do most of the separating.

### 3.4 Z-index scale

| Layer | z-index |
|-------|---------|
| Sticky progress inside learning stage | `5` |
| Sticky action bar | `10` |
| App header (`sticky-top`) | `1030` (Bootstrap) |
| Study/vocab modal backdrop | `1055` (above Bootstrap modal 1050) |
| Toast stack | Bootstrap default (1080 region) |

### 3.5 Motion tokens

| Kind | Duration | Easing |
|------|----------|--------|
| Micro (hover, color, border) | `100–150ms` | `ease` |
| Entrance / transitions | `150–300ms` | `ease-out` |
| Signature (card flip) | `450ms` | `ease` |
| Auto-advance pause (learning) | `1–2s` timer | — |

Animate **only** `transform` and `opacity` (GPU-friendly, no layout thrash).
See §8.

---

## 4. Layout architecture

### 4.1 App shell

```
#app (flex column, min-height: 100dvh)
├── AppHeader        (sticky-top, --app-header-h: 56px, z-1030)
└── main.app-main    (flex: 1, max-width: 1200px, centered)
    └── <view>
```

- `#app`, `.app-main`, `.learning-shell`, `.learning-stage`,
  `.sticky-action-bar` are **global primitives** in `src/style/index.css`.
  Views must build on them, not re-implement them.
- `.app-main` centers content and caps width at `1200px` — this is the
  "avoid excessive width" rule for large screens.

### 4.2 The two scroll models

**A. Page scroll (default)** — Home, Word Management, Word Selection, Skill
Selection. Content flows naturally; the page may scroll; bottom CTAs live in
`.sticky-action-bar` (sticky bottom, safe-area padded).

**B. Contained learning scroll (Learning screens only)** — `.learning-shell`
owns a **fixed** viewport-derived height:

```
.learning-shell  → height: calc(100svh|100dvh − --app-header-h − 1rem); overflow: hidden
└── .learning-stage → flex: 1; min-height: 0; overflow-y: auto
                      padding-bottom: calc(1rem + env(safe-area-inset-bottom))
```

Rules for model B:
1. The **page itself never scrolls**; only `.learning-stage` does. Header and
   everything outside the stage stay fixed and reachable.
2. `ProgressStats` inside the stage is **sticky** (top: 0) so progress remains
   visible while questions scroll.
3. Any bottom-anchored control must be inside the stage (which already carries
   the safe-area padding), never `position: fixed` ad hoc.
4. Never put content outside `.learning-stage` that can grow unbounded.

### 4.3 Viewport-unit rules (mobile browser chrome)

Mobile address bars collapse/expand, changing the visual viewport. Therefore:

- Prefer `100svh` (small viewport) first, then override with `100dvh`
  (dynamic) — exactly as `.learning-shell` does. **Never use `100vh` alone.**
- Never use fixed pixel heights for content areas; derive from viewport units,
  flex, or `min()/max()/clamp()`.
- Anything pinned to the bottom edge gets
  `padding-bottom: calc(x + env(safe-area-inset-bottom))`.
- Subtract `--app-header-h` when an element must fill "the rest of the screen"
  under the sticky header (prevents double-viewport overflow).
- Use `height` (not just `min-height`) when an inner region must become the
  scroll container; combine with `min-height: 0` on the flex child.

### 4.4 Breakpoints (Bootstrap)

| Range | Device class | Layout rule |
|-------|--------------|-------------|
| `< 576px` | Phones (portrait) | **One vertical column.** Everything stacks; total height must fit (learning) or scroll smoothly (lists). |
| `≥ 576px` | Large phones / small tablets | Card grids become 2 columns (`col-sm-6`). Learning content stays one centered column. |
| `≥ 768px` (md) | Tablet / small laptop | Two-zone splits allowed (e.g. filter row inline, secondary columns `d-md-block`). |
| `≥ 992px` (lg) | Desktop | Full multi-column layouts per §5; secondary columns appear (`d-lg-block`). |
| `≥ 1200px` | Wide desktop | `.app-main` caps at `1200px` and centers — no stretched content. |

**Hard rule: no horizontal overflow at any width down to 320px.** Use
`flex-wrap`, `min-width: 0`, `overflow-wrap: anywhere`, and grid `col-*`
classes. Verify in devtools device mode.

## 5. Responsive layout patterns

### 5.1 Phones (portrait, `< 576px`) — single column

Stack, top to bottom, in this order (learning screens as the reference):

```
[Header row]      skill/page title + status badge  (fixed, outside stage)
[Progress]        ProgressStats — sticky while scrolling
[Content]         prompt / card / question  (inside .learning-stage)
[Controls]        options · input · primary action
[Sticky CTA]      (selection screens only) .sticky-action-bar
```

- One column, full width, `min(560px, 100%)` panels centered.
- Total height of *fixed* (non-scrolling) parts must stay well under the
  viewport; the rest lives in the scroll region.
- Grids collapse to `col-12`; secondary columns are `d-none` (`d-sm-*`/`d-md-*`
  to reveal).

### 5.2 Tablets (`576–991px`) — transition zone

- Card grids: 2 columns (`col-sm-6`).
- Filter/search rows go inline (`col-12 col-md-4` style splits).
- **Learning content remains a single centered column** — never split a
  question across columns.

### 5.3 Desktop (`≥ 992px`) — purposeful multi-column

Optimize horizontal space without stretching content. Preferred template:

```
| Column 1 (rail)      | Column 2 (center, focused)         | Column 3 (rail)  |
| context / progress   | PRIMARY content — horizontally     | empty space or   |
| meta, filters, word  | centered, max 560–640px, vertically| secondary info   |
| lists, summaries     | centered when vertical space allows|                  |
```

Rules:
- The **learning/working content is always horizontally centered** so the eye
  locks onto it. Side rails absorb leftover width (they may be visually empty —
  that is intentional focus design).
- Use `row`/`col-*` or CSS grid; center column `mx-auto` + `width: min(560px, 100%)`.
- Do not exceed `--app-header-h`-aware heights; on desktop the learning shell
  still fills the viewport via model B.
- Wide screens must not produce overly long text lines: cap columns, not the
  whole page (`.app-main` already caps at 1200px).

### 5.4 Landscape phones & short viewports

- The `.learning-shell` height formula handles toolbar collapse — no layout
  shift, no page scroll.
- Compact the fixed header rows (single-line title + badge), reduce decorative
  margins (`my-1`/`my-2` instead of `my-4`), let `.learning-stage` scroll.
- Verify with devtools "short viewport" presets (§14 matrix).

### 5.5 One component, all layouts

Never fork a component into "mobile" and "desktop" versions. The same SFC must
serve every breakpoint, adapting via utility classes and a handful of scoped
media queries. If a layout truly diverges, restructure the *page* (§12), not
the component contract.

---

## 6. Content hierarchy: primary vs secondary

Every screen answers three questions instantly: *Where am I? What do I do?
What is secondary?*

| Level | Style | Examples |
|-------|-------|----------|
| **Primary action** | `btn btn-primary` (solid brand) — **exactly one per screen** | Bắt đầu học, Tiếp, Kiểm tra, + Thêm bộ sưu tập |
| **Secondary actions** | `btn btn-outline-secondary` / `btn-outline-primary` | Quay lại từ vựng, Xóa lọc, Nghe lại |
| **Destructive** | `btn-outline-danger` + `uiStore.confirm()` | Xoá bộ sưu tập / từ vựng |
| **Primary content** | `--app-surface` panel, `fw-semibold`, largest type in context | Prompt, flashcard word, selected option |
| **Secondary content** | `.text-muted`, `.small`, `text-bg-light` badges | Transcription, meta (type/topic/level), hints |
| **Status** | Semantic badges / colored text + icon | ✓ Hoàn thành, Còn lại, Đúng/Sai |

Hierarchy rules:
1. Size + weight + color carry the hierarchy; **borders do not** (borders mark
   interactive containers only).
2. Whitespace groups; a new section starts with `mb-3`/`mb-4` + a heading.
3. Muted text is for *supporting* info — never for anything the user must act
   on.
4. One idea per panel; don't pile controls into one card.
5. Empty space is a design element — on desktop, empty rails are preferable to
   stretching the focus column.

## 7. Component standards & catalog

### 7.1 Component inventory (do not re-create these)

| Component | Path | Purpose / notes |
|-----------|------|-----------------|
| `AppHeader` | `layout/` | Logo (→home), Back (state-driven), Refresh. Sticky, in flow. |
| `AppSpinner` | `common/` | Universal loading state. Use it — never an ad-hoc spinner. |
| `ToastStack` + `ConfirmModalHost` | `common/` | Global feedback via `uiStore.pushToast` / `uiStore.confirm`. Never `alert()`/`confirm()`. |
| `CollectionCard`, `CollectionFormModal` | `collections/` | Collection grid card + create/edit modal. `CollectionCard` anatomy: brand-tinted gradient **hero** (monogram avatar from `symbol`, `fw-semibold` title, monospace code chip + language), **meta row** (`Tạo <date>` via `lib/datetime` + 44×44 edit/delete icon buttons with `aria-label`), **action pair** (`Học ngay →` `btn-outline-primary fw-semibold` + `Từ vựng` — outline only; the Home header CTA is the page's single primary). Hover/focus lift + brand ring; `prefers-reduced-motion` honored. |
| `FilterBar`, `WordRow`, `ComboBoxField`, `WordFormModal` | `words/` | Search/filter row, list row, combo inputs, word CRUD modal. Reuse `FilterBar` anywhere a word list needs search+filters (already used by Word Selection). |
| `ProgressStats` | `learning/` | Progress badges + bar (BR-60..62). Required on every learning screen; sticky inside `.learning-stage`. |
| `AudioPlayButton` | `learning/` | Shared TTS replay trigger for all skill games. **All four games use the `icon` variant — a round 44px ghost glyph — for a uniform interface.** The `label` / `large` variants remain available if a screen ever needs a text affordance. Parents own `speak()` via `services/speech` and pass `unavailable` (AMB-12) to disable; the component never touches the Web Speech API and stops native click propagation (flashcard flip-safe). |
| `VocabularyDetailModal` | `learning/` | Full word detail popup (wrong-answer study card, Teleported, `Đã học` advances). Reuse for any "show word details" need. |
| Skill games | `learning/skills/` | `FlashCardGame`, `MultipleChoiceGame`, `ListeningGame`, `TypingGame` — share one anatomy (§7.3). |
| Views | `views/` | Home, WordManagement, WordSelection, SkillSelection, Learning, NotFound. |

### 7.2 Shared building rules

- SFC with `<script setup>`; props camelCase; emits as verb phrases
  (`@save`, `@learned`, `@completed`) — matches `docs/architecture.md`.
- **No business logic in components.** Components read state via stores and
  call store/engine actions; the engine owns queue/retry/completion rules.
- Scoped styles only; every color/spacing value from §3 tokens or Bootstrap
  variables. Hardcoded hex = bug.
- Every component must be responsive by construction (§5) and keyboard
  accessible (§10).

### 7.3 Learning-screen anatomy (all skill games share this)

```
ProgressStats                     (sticky in stage)
[Prompt area]                     audio button (if audio) · prompt/card
[Answer area]                     option buttons OR text input
[Feedback]                        text-success / text-danger + icon
[Study modal]                     on wrong answers (MCQ/Listening/Typing)
```

- **Option buttons** (A/B/C/D): flex row, letter circle `1.9rem`, text
  `overflow-wrap: anywhere`; states `is-feedback` (idle hover), `is-correct`
  (green), `is-wrong` (red), `is-dimmed` (opacity .55); locked after answer
  (`cursor: default`, `pick()` guards).
- **Feedback text**: success/danger colored + `role="status"`; auto-advance
  shows "— tiếp tục tự động…".
- **Audio button**: shared `AudioPlayButton` (§7.1) rendered as the same round
  icon button in every skill game, disabled when TTS unavailable + warning
  text; playback stays in `services/speech` — neither the component nor the
  games touch `window.speechSynthesis`.
- **Wrong-answer popup**: `VocabularyDetailModal` only; commit to engine only
  on `Đã học` (wrong → re-queued, not learned).
- **Timers**: every auto-advance timer must be cleared on question change and
  on unmount.

### 7.4 Buttons

| Kind | Class | When |
|------|-------|------|
| Primary CTA | `btn-primary` | One per screen. |
| Secondary | `btn-outline-secondary` | Navigate back, clear filters, replay. |
| Accent secondary | `btn-outline-primary` | Focus-supporting actions (Nghe lại). |
| Destructive | `btn-outline-danger` + confirm modal | Delete collection/word. |
| Success confirm | `btn-success` | Đã nhớ / Đã học. |
| Warning (re-learn) | `btn-outline-warning` | Học lại. |

All buttons/inputs: `min-height: 44px` (global rule). Disabled when the action
is invalid (`:disabled`), with a hint when the reason isn't obvious.

### 7.5 Cards

`.card` + `border` + token radius + soft shadow. Interactive cards get the
hover lift (§3.3) and a `border-primary` selected state. Card grids:
`row g-3` + `col-12 col-sm-6 col-lg-4` (3 on desktop) or `col-lg-3` (4-up for
the four skills).

### 7.6 Inputs & forms

`form-control` / `form-select` (44px min). Label above each field
(`form-label small text-muted`). Validation: `text-danger small` under the
field; errors keep modals open. Autocomplete/autocapitalize/spellcheck off for
answer inputs.

### 7.7 Modals & popups

Teleport to `body`; backdrop `rgba(0,0,0,.5)` + `backdrop-filter: blur(2px)`;
card `min(420px, 100%)`, `max-height: calc(100dvh - 2rem)`, `overflow-y: auto`;
footer button(s) full width with safe-area padding; `aria-modal="true"` +
labelled. One primary footer button. Close on explicit action (or backdrop tap
for non-critical dialogs).

### 7.8 Lists

- **Selection lists** (Word Selection): `list-group` rows + checkbox, left
  text truncated, right meta badges.
- **Management lists** (Word Management): `table-responsive` table with a fixed
  five-column layout — **Từ · Phiên âm · Nghĩa · Danh mục (type/topic/level
  badges) · Thao tác** (44px icon buttons) — inside the `.list-panel` surface.
- Both must reuse `FilterBar` for search/filter parity.

### 7.9 Feedback & states

- Toasts: success (green) / danger (red) via `uiStore.pushToast`; concise,
  no stacks of jargon.
- Loading: `AppSpinner` with a human label.
- Error: message + reason (`fetchError`) + **Thử lại** button.
- Empty: friendly guidance + the action that fixes it (e.g. "+ Thêm từ vựng").
- Filtered-empty: distinct message ("Không có từ vựng nào khớp bộ lọc.").

## 8. Motion & animation guidelines

| Interaction | Animation | Spec |
|-------------|-----------|------|
| Card flip (flashcard) | 3D rotateY front↔back | `450ms ease`, `perspective: 1200px`, `preserve-3d`, `backface-visibility: hidden` |
| Correct/wrong feedback | Border + background tint transition | `150ms ease` |
| Option lock | Others dim | `150ms` opacity |
| Card/list hover | Lift | `100–150ms`, `translateY(-2px)` + shadow |
| Modal appear | Fade + slight scale | `200ms ease-out` |
| Progress bar | Width change (animated stripes while active) | Bootstrap default |
| Toast | Slide/fade in/out | Bootstrap default |

Rules:
1. Animate **state changes** the user caused (flip, answer, open) — never
   ambient looping decoration.
2. Only `transform` + `opacity`; animating `height/width/margin` causes jank
   and layout shift (violates P2/P3).
3. Durations ≤ 450ms; longer feels sluggish during rapid learning loops.
4. New animations must include a `@media (prefers-reduced-motion: reduce)`
   override that removes non-essential transforms.
5. Auto-advance delays are **timers in script** (1–2s), not CSS — they must be
   cancellable (question change, unmount).

---

## 9. Color & theming rules

1. **Never hardcode hex** in components. Use `var(--app-*)`, Bootstrap
   semantic classes (`text-success`, `text-bg-danger`, `border-primary`), or
   `rgba(var(--app-brand-rgb), x)` for brand tints.
2. **Semantic mapping is fixed:** brand/primary → action, selection, focus;
   success → correct, learned, mastery, confirm; danger → wrong, delete,
   error; warning (+`text-dark`) → pending / needs re-learn; light/secondary
   badges → descriptive meta only (type, topic, level).
3. **Contrast**: white text only on solid brand/success/danger backgrounds;
   `text-dark` on warning tints; muted text only on light surfaces.
4. Color is **never the only signal** — pair green/red with ✓/✗ icons and text.
5. Introducing a new color = extend `:root` in `index.css` **and** update this
   document in the same change.
6. Dark mode is not supported today; author components with tokens (not
   literals) so it can be added later without rewrites.

---

## 10. Accessibility & touch

- **Targets ≥ 44×44px** (global `.btn/.form-control/.form-select` rule) with
  8px+ spacing between adjacent targets.
- **Keyboard parity** per screen:
  - Flashcard: Enter/Space = flip (front) → Đã nhớ (back); buttons clickable.
  - MCQ/Listening: `1–4` pick options; `R` replay (listening).
  - Typing: Enter checks (never double-fires on modal/button focus).
- **Semantics**: `role="status"` for async feedback, `role="progressbar"` +
  `aria-valuenow` for progress, `aria-modal` + label for dialogs,
  `aria-pressed` for selectable options, `aria-invalid` for failed inputs.
- **Labels**: every input has a visible `<label>` (FilterBar pattern).
- **Focus visibility**: keep default outlines or an explicit
  `:focus-visible` style; never bare `outline: none`.
- **Reduced motion**: honor `prefers-reduced-motion` for new animations.

---

## 11. Screen states (every async surface)

Standard order — implement all of them, always:

1. **Loading** → `AppSpinner` with a human label ("Đang tải từ vựng...").
2. **Error** → short message + root cause (`fetchError`) + **Thử lại** button.
3. **Empty** → explain + show the fix ("Bấm + Thêm từ vựng để bắt đầu.").
4. **Content** → the real UI.
5. **Filtered-empty** → separate message so users know data exists but the
   filter excludes it.

Mutations: no optimistic UI — wait for the store result, close modals on
success, keep them open with inline errors on failure, and surface server
errors as danger toasts (FR-X05).

Learning-flow UX invariants (already implemented; do not regress): instant
answer feedback; auto-advance only on correct; wrong answers wait for the
study modal's **Đã học**; progress always visible; wrong items re-queue
randomly and mastery-debt must be repaid (see engine `requiredCorrect`).

## 12. Page patterns (consistency map)

| Page | Header pattern | Body layout | Footer / CTA | Scroll model |
|------|----------------|-------------|--------------|--------------|
| Home (`/`) | `h3` count + primary "Thêm" | Grid of `CollectionCard` (`col-12 col-sm-6 col-lg-4`) | — (card actions) | A: page |
| Word Management | `h3` collection name + counts + "Thêm từ" | `FilterBar` + `table-responsive` table | — (row actions) | A: page |
| Word Selection | Title + "Đã chọn" badge + collection meta | `FilterBar` + `list-group` checkbox rows | `.sticky-action-bar`: count + **Tiếp →** | A: page |
| Skill Selection | Title + "Đã chọn: N" badge | Skill card grid (`col-lg-3`), **single-select** | Header **Tiếp →** → Skill Options | A: page |
| Skill Options (`/learn/select-options`) | Title + "N kỹ năng" badge | Stacked reusable `SkillOptionsPicker` (`min(640px,100%)`) — toggle rows with ✓ marks | **Bắt đầu học →** primary action inside each picker header (disabled until ≥1 option) | A: page |
| Learning (`/learn/:skillId`) | Skill label + completion badge | `learning-shell` → `learning-stage` → skill game (centered per §5.3) | — (in-stage controls) | **B: contained** |
| Not Found | — | 404 + **Về trang chủ** | — | A: page |

Consistency rules:
- Same header anatomy (title left, status/primary action right) everywhere.
- Same grid classes for card collections; same list primitives for word lists.
- Same sticky-bar pattern for any screen with a "continue" CTA.
- Learning screens are the visual core — the rest stays quieter (less color,
  smaller type) so entering a session feels like focus mode.

---

## 13. Do / Don't

**Do**
- Build mobile-first, then enhance at `sm/md/lg`.
- Center learning content; let rails absorb desktop width.
- Use `svh/dvh` + safe-area insets for viewport-height and bottom-pinned UI.
- Keep exactly one primary action per screen; mute everything else.
- Reuse `FilterBar`, `ProgressStats`, `AppSpinner`, `VocabularyDetailModal`,
  toasts, and confirm dialogs.
- Give instant local answer feedback, then hand off to the engine.
- Write scoped CSS with tokens; test 320px and desktop every time.

**Don't**
- Don't use `100vh`, fixed pixel heights, or `position: fixed` for content.
- Don't let the learning page scroll; scroll belongs to `.learning-stage`.
- Don't hardcode colors, create second spinner/modal/toast systems, or embed
  engine/business logic in components.
- Don't fork mobile/desktop component variants.
- Don't animate layout properties or exceed 450ms for interactions.
- Don't add a second primary CTA or place two solid buttons side by side.

---

## 14. Checklists

### 14.1 New screen
- [ ] Uses the app shell and the correct scroll model (§4.2).
- [ ] Header pattern matches §12; exactly one `btn-primary`.
- [ ] Loading / error / empty / content states implemented (§11).
- [ ] Works as single column at 320px; no horizontal overflow.
- [ ] Desktop ≥ 992px follows §5.3 (centered focus column, rails absorb width).
- [ ] All colors from tokens; scoped CSS only.
- [ ] Keyboard pass done; targets ≥ 44px.
- [ ] Route guard + state rules verified against BR-70…72.

### 14.2 New component
- [ ] Checked §7 catalog — nothing reusable exists already.
- [ ] Props camelCase, emits as verb phrases, no store mutation inside.
- [ ] Token-only styling, scoped, responsive, focus-visible.
- [ ] Documented here (§7) if intended for reuse.

### 14.3 Responsive QA matrix (run before "done")

| Preset | Size | Check |
|--------|------|-------|
| Phone portrait | 320×568 · 375×667 · 414×896 | Single column, no horizontal scroll, controls reachable, no overlap |
| Phone landscape | 734×414 (rotate 360×740) | Shell fits, no double scroll, bottom buttons above browser chrome |
| Tablet | 768×1024 | 2-col grids, learning column centered |
| Laptop | 1280×720 | Learning shell fits; short-height behavior correct |
| Desktop | 1920×1080 | Content ≤ 1200px centered; rails absorb width |
| Dynamic chrome | Devtools dvh toggle / real device | No layout shift, nothing stuck behind address bar |

---

## 15. Governance

- Tokens and layout primitives live **only** in `src/style/index.css`.
- Any change to tokens, primitives, or shared components must update this
  document (and `docs/architecture.md` §8 if structural) in the same change.
- Prefer evolving existing components over adding parallel ones; deleting a
  duplicate is progress.
- When a UX decision is ambiguous, choose the option that keeps the learning
  screen focused, the mobile layout a single column, and the code reused.

*End of document.*





