# Implementation Plan — Vocabulary Learning Web App

> Status: Draft for review. Owner: Project (AI dev team per AGENTS.md).
> **Approach:** incremental phases, each delivering working, reviewable slices — never a one-shot
> "big bang". Each phase ends with lint/build/tests green, per AGENTS.md §Development Rules.

---

## 0. Definition of Done (every phase)

- [ ] Lint passes (add `eslint` + config early).
- [ ] `npm run build` (production Vite build) exits 0.
- [ ] Tests (Vitest) added for non-trivial logic modules (engine, services, store mutations).
- [ ] Manual smoke of the phase's user flows on desktop **and** mobile viewport.
- [ ] No `console.log`/dead-code lint warnings (except intentional dev logs), no secrets.

---

## Phase 0 — Foundation, Security & Scaffolding

**Goal:** resolve SEC-1, wire the tech stack, define the skeleton every later phase fills.

Tasks:

1. **Security first (SEC-1)**
   - Revoke/rotate the leaked service-account key (`study-vocalubary-db.json`) in Google Cloud.
   - Extend `.gitignore` (patterns for `*-db.json`, `*service-account*.json`, `*.private.*`) and
     confirm with `git check-ignore`.
   - Delete the exposed key file from the working tree (git rm) and document in README.
2. **Install dependencies** (`package.json`):
   - `vue-router`, `pinia`, `bootstrap` (+ `@popperjs/core`/`bootstrap-icons` as needed), `firebase`
     (modular), dev tools: `eslint`, `vitest` (+ `@vitest/ui` optional).
3. **Env config**: `.env` sample + `src/firebase/config.js` reading `import.meta.env.VITE_FIREBASE_*`
   (public Web config; no secrets).
4. **Bootstrap app**:
   - `src/main.js`: pinia + router + import `bootstrap` and `src/style/index.css`.
   - `src/App.vue`: root layout = `Header` + `<RouterView/>` + `ToastStack` + global `ConfirmModal`.
5. **Route skeleton** (placeholders): Home, WordManagement, WordSelection, SkillSelection, Learning,
   404 — with guards from `architecture.md` §6.
6. **Stores skeleton**: `collectionsStore`, `wordsStore`, `learningStore`, `uiStore` (empty states + shapes).
7. **lib utilities**: `uuid`, `validators`, `text` (localeSort, normalize, diacriticFold), `datetime`.

**Acceptance:** build runs; blank screens render; refresh/back buttons no-op gracefully; security
concretized (key gone from tree + ignored); has lint baseline.

---

## Phase 1 — Collections module

**Goal:** full collections CRUD with cache-first reads + mutation-updates.

Tasks:
- `services/firebase/init.js`, `collections.repository.js`, `mappers.js`.
- `collections.service.js` (validation, repository, cache orchestration).
- `collectionsStore` populated (`ensureLoaded`, `refresh`, `add/update/remove`).
- UI: `HomeView` (grid `CollectionCard`), `CollectionFormModal` (create/update), `CollectionConfirmDelete`
  with cascade warning (BR-13), sorting getter.
- Header: logo→home + refresh wired.

**Acceptance (FR-C01..06):** grid sorted A→Z; create validates & closes on success (no GET); edit keeps modal on validation error; delete cascade warns + removes; refresh reloads.

---

## Phase 2 — Words module (management)

**Goal:** word management page with search/filter/sort + combobox CRUD.

Tasks:
- `words.repository.js`; `words.service.js` (**cache-move** on `collectionId` change, BR-23).
- `wordsStore`: `ensureWords`, add/update/delete, `filterOptions`, `removeCollectionData`.
- `WordManagementView`: `WordList`/`WordRow`, `FilterBar` (type/topic/level dedup combos + search),
  client-side sort by word A→Z.
- `WordFormModal`: all fields; type/topic/level = combobox (dropdown+datalist/free typing, FR-W08).
- `WordConfirmDelete` (BR-14).

**Acceptance (FR-W01..09):** list from cache; search/filter/sort without Firebase; create word (adds to
bucket + option lists); edit; delete confirm; moving word across collections updates both buckets.

---

## Phase 3 — Selection flows

**Goal:** Word Selection + Skill Selection screens.

Tasks:
- `WordSelectionView`: checkbox rows + select-all, restore from `selectedWordIds`, sticky `Đã chọn: x/N`
  CTA enabled at ≥4 (FR-L02/03, BR-31).
- `< 4` block message (AMB-6 / BR-32).
- `SkillSelectionView`: 4 cards from `SKILLS` iteration, checkboxes ≥1 (FR-L04, BR-33), `BẮT ĐẦU` CTA.
- Back-button state transitions (BR-70-72) via `learningStore` actions.

**Acceptance:** selection persists across back; ≥4 gate; ≥1 skill gate; navigating home resets context.

## Phase 4 — Learning engine core + FLASH_CARD

**Goal:** framework-free engine + flash card skill end-to-end.

Tasks:
- `engine/core/math.js` (seedable shuffle, pickDistractors), `constants.js` (SKILL_IDS, MIN_WORDS=4,
  MIN_SKILLS=1), `session.js` (LearningSession, queue, stats, progress).
- `engine/skills/flashCard.js` (BR-40..43) + `registry.js`.
- `services/audio.service.js` (Web Speech API, feature-detect).
- `LearningView`, `LearningShell`, `components/learning/skills/FlashCardGame.vue`
  (flip via click/Enter/Space; `Đã nhớ` / `Học lại`).
- `useLearning` composable bindings (start/answer/retry).
- Vitest unit tests for engine (queue completion, retry, counts, randomization determinism w/ seed).

**Acceptance (FR-L05/06/10):** snapshot begins at first skill; 3 cards per word, randomized; must flip
before acting; `Đã nhớ`/`Học lại` work; retries reappear; ends only when queue empty; progress bar live.

---

## Phase 5 — MULTIPLE_CHOICE, LISTENING, TYPING

**Goal:** remaining three skills, all sharing the shell/stats.

Tasks:
- `engine/skills/multipleChoice.js` (BR-44..47) — 6 templates, 4 options, show-correct, retry.
- `engine/skills/listening.js` (BR-48..49) — auto-play audio on entry + replay; 4 options; retry.
- `engine/skills/typing.js` (BR-50..52) — 3 key→target templates; normalized compare; show-correct; retry.
- UI: `MultipleChoiceGame.vue`, `ListeningGame.vue`, `TypingGame.vue` (register in `LearningView`).
- Session-completion flow (`markSkillCompleted`, next uncompleted skill, session-done screen).

**Acceptance (FR-L07..12):** each skill runs, wrong answers re-appear randomly; correct revealed on miss;
progress + correct/incorrect correct; skill completes → returns to Skill Selection highlighting done;
exiting preserves other skills.

---

## Phase 6 — UX polish, responsive & QA

**Goal:** production polish and full validation.

Tasks:
- Responsive tuning: `svh`/`dvh`, sticky action bars, safe-area insets, touch targets ≥44px
  (FR-X03/X04). Verify: desktop, portrait & landscape mobile, short/tall viewport.
- Keyboard full pass (Enter/Space flip, digit options, Enter submit) + focus rings.
- Empties, toasts, error retry everywhere (FR-X05/X07); spinners replaced; no dead states.
- Refresh/back semantics re-check across screens.
- Accessibility aria on modal/confirm/toast; contrast check.
- Final QA matrix: map FR-*/BR-* → one manual test; run `eslint`, `vitest`, `npm run build`.

**Acceptance:** all screens usable on both device classes; no infinite loaders; all CRUD+cache rules hold;
production build clean.

---

## 7. Validation Commands (Windows / PowerShell)

```
npm install                 # install new deps
npm run dev                 # manual dev testing (http://localhost:5173)
npm run build               # production build
eslint src --ext .js,.vue   # lint (after config)
vitest                      # run unit tests (engine / stores / services)
git status / git check-ignore study-vocalubary-db.json   # ensure secret stays out
```

---

## 8. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Leaked Firebase key not revoked | Blocked until Phase 1; treat as top task; rotate + git-ignore. |
| TTS voices missing on some OS (AMB-12) | Feature-detect + fallback text hint; never block the question. |
| Firestore composite index not provisioned | Document + create `(collectionId ASC, word ASC)` in console before Phase 2. |
| Firestore query limit / many words | Cache whole collection; add pagination behind store only if >2k (NFR-7). |
| Retry queue grows from repeated mistakes | Cap infinite loops: still finite (mastery eventually); numeric labels + progress reassure. |
| Multi-tab edits lose sync | Refresh button = documented resync (BR-74); acceptable single-tab assumption. |

---

## 9. Estimated Phase Order (dependency-safe)

```
0 → 1 → 2 → 3 → 4 → 5 → 6
     4/5 depend on 0/1/3 (words + selection exist before engine).
```

Each phase is a mergeable PR-sized unit; review + (user) approval gates at Phase 0 end and after each
ship so the plan stays aligned.

---

*End of implementation plan. Cross-references: `architecture.md`, `business-rules.md`, `analysis.md` (SEC-1).*