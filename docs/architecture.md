# Architecture — Vocabulary Learning Web App

> Status: Draft for review. Owner: Solution Architect / Frontend Architect.
> Scope: layered architecture, folder structure, dependency rules, routing, extensibility.

---

## 1. Architecture Principles

1. **Layered & strict dependency direction** — UI → stores → (business + services) → Firebase, never backwards.
2. **Firebase isolation** — the SDK is imported only by modules inside `src/services/firebase/`; nothing
   else imports `firebase/*`. Makes DB swapping and unit testing trivial.
3. **Learning engine is framework-free** — `src/engine/` is plain ES modules with zero Vue imports; the UI
   binds through a thin adapter.
4. **State centralized in Pinia** — components never own cross-screen mutable data.
5. **Business logic in modules, not templates** — composables/services own logic; templates only render.
6. **Small files** — each module has one concern; target < ~300 lines/file.
7. **Cache-first reads; mutation → cache → UI writes** (see `cache-strategy.md`).

---

## 2. Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ UI LAYER  (Vue SFCs)                                         │
│  router views · shared components · layout (header/nav)      │
└───────────────┬──────────────────────────────────────────────┘
                │ composition
┌───────────────▼──────────────────────────────────────────────┐
│ PRESENTATION LOGIC (composables)                             │
│  useCollections · useWords · useLearning · useToast          │
│  form state, validation wiring, keyboard handling             │
└───────────────┬──────────────────────────────────────────────┘
                │ state read/write
┌───────────────▼──────────────────────────────────────────────┐
│ STATE LAYER (Pinia stores)                                   │
│  collectionsStore · wordsStore · learningStore · uiStore     │
└───────────────┬──────────────────────────────────────────────┘
                │ calls
┌───────────────▼──────────────────────────────────────────────┐
│ SERVICE LAYER (business rules + cache orchestration)          │
│  src/services/  (domain services)                            │
│    collections.service.js · words.service.js                 │
│    learning.service.js · audio.service.js                    │
└───────────────┬──────────────────────────────────────────────┘
                │ calls
┌───────────────▼──────────────────────────────────────────────┐
│ DATA-ACCESS LAYER (Firebase isolated)                         │
│  src/services/firebase/                                      │
│    init.js · collections.repository.js                        │
│    words.repository.js · mappers.js                          │
└───────────────┬──────────────────────────────────────────────┘
                │
         ┌──────▼──────┐
         │  Firestore  │
         └─────────────┘

┌──────────────────────────────┐   ┌────────────────────────────┐
│ LEARNING ENGINE (src/engine) │   │  UTILITIES (src/lib)        │
│ framework-free pure logic    │   │  uuid validators text       │
│ session.js · registry …      │   │  localeSort datetime        │
└──────────────────────────────┘   └────────────────────────────┘
```

- The **engine** is consumed by stores/composables (snapshot + progress inside `learningStore`, item
  evaluation in skill components); it never touches Vue or Firebase.
- **Dependency rule**: `views → composables → stores → services → firebase-*`. `engine` and `lib` are
  available to layers above them, not below.

## 3. Proposed Folder Structure

```
src/
├── main.js                     # bootstrap: pinia, router, css imports
├── App.vue                     # root layout (Header + <RouterView/> + toasts/root modals)
├── router/
│   ├── index.js                # createRouter(history, routes) + guards
│   └── routes.js               # path table (see §6)
├── firebase/
│   └── config.js               # public Web SDK config from import.meta.env (NO secrets)
├── services/                   # domain services: business-rule orchestration
│   ├── collections.service.js
│   ├── words.service.js
│   ├── learning.service.js     # starts/continues sessions via engine
│   ├── audio.service.js        # Web Speech API wrapper (TTS)
│   └── firebase/               # ONLY directory importing the Firebase SDK
│       ├── init.js
│       ├── collections.repository.js
│       ├── words.repository.js
│       └── mappers.js          # Firestore <-> domain mappings, timestamps
├── stores/                     # Pinia
│   ├── collectionsStore.js
│   ├── wordsStore.js
│   ├── learningStore.js
│   └── uiStore.js              # toasts, modals, global loading
├── engine/                     # framework-free learning engine
│   ├── core/
│   │   ├── session.js          # LearningSession (snapshot, progress, queue)
│   │   ├── math.js             # shuffle, pickDistractors, randomInt
│   │   └── constants.js        # SKILL_IDS, MIN_WORDS, MIN_SKILLS
│   ├── skills/
│   │   ├── flashCard.js
│   │   ├── multipleChoice.js
│   │   ├── listening.js
│   │   └── typing.js
│   └── registry.js             # skill register + lookup by id
├── lib/
│   ├── uuid.js                 # UUID v4 (crypto.randomUUID + fallback)
│   ├── validators.js           # collection/word field validation
│   ├── text.js                 # normalize, localeSort, diacriticFold
│   └── datetime.js             # ISO timestamp helpers
├── composables/
│   ├── useCollections.js
│   ├── useWords.js
│   ├── useWordSelection.js
│   ├── useSkillSelection.js
│   ├── useLearning.js
│   └── useViewport.js          # viewport flags (svh/dvh…)
├── components/
│   ├── layout/                 # AppHeader (logo, refresh, back)
│   ├── common/                 # AppModal · ConfirmModal · ToastStack · EmptyState · ProgressBar · Spinner
│   ├── collections/            # CollectionGrid · CollectionCard · CollectionFormModal · DeleteConfirm
│   ├── words/                  # WordList · WordRow · WordFormModal · FilterBar · ComboBoxField
│   └── learning/
│       ├── LearningShell.vue   # shared stats bar + skill host
│       └── skills/             # FlashCardGame · MultipleChoiceGame · ListeningGame · TypingGame
├── views/
│   ├── HomeView.vue
│   ├── WordManagementView.vue
│   ├── WordSelectionView.vue
│   ├── SkillSelectionView.vue
│   ├── LearningView.vue         # route `/learn/:skillId` hosted components
│   └── NotFoundView.vue
├── style/
│   ├── index.css                # tokens/variables, base, viewport utils
│   └── learning.css             # learning-screen layouts (svh-safe)
└── assets/
```

Everything else (docs, public, build config, `.env*`) stays outside `src/`.

## 4. Module Responsibility Map

| Module | Responsibilities | Must NOT |
| --- | --- | --- |
| `src/firebase/config.js` | Read Firebase Web config from env vars; export config object only. | Expose any secret; import engine or UI. |
| `services/firebase/*` | Firestore CRUD; Firestore Timestamp ↔ ISO string; query building. | Apply business rules; know UI stores. |
| `services/collections.service.js` | Orchestrate collection CRUD: validation, repos, store cache update, sort. | Import Vue; format UI. |
| `services/words.service.js` | Orchestrate word CRUD incl. **cache-move** on collectionId change; rebuild filter options. | — |
| `services/learning.service.js` | Build session snapshots via engine; coordinate cache + learningStore. | — |
| `services/audio.service.js` | Hide Web Speech API; feature-detect; speak(text, lang). | — |
| `engine/*` | Generate items, run queue, compute progress, evaluate answers (pure) | Import Vue/Firebase/Pinia |
| `stores/*` | Single source of truth for screen state; expose actions/composables contracts. | Business rules; direct Firebase |
| `composables/*` | Mediate views ↔ stores/services; keyboard handling, form drafts. | Firebase |
| `components/…` | Presentational + evented; template only minimal logic. | Firebase; heavy logic |
| `views/*` | Route-level composition, layout per screen. | — |

## 5. Data Flows

### Read flow (cache-first)
```
View → composable → store.getOrFetchWords(collectionId)
        store: loadedWordCollectionIds.has(collId)?  → return cached copy
        else  → service → repository.getWordsByCollection() → cache (wordsByCollection)
        → return cache
```

### Write flow (mutation-first)
```
View → composable → store action → service
  → domain validation (lib/validators) → repository (Firebase write)
  → on error: toast + keep modal + NO cache change
  → on success: store.applyMutation(patch) → UI re-renders (no refetch)
```

### Learning flow
```
SkillSelection → learning.service.startSession({...})
  → engine.registry[skillId].generate(words) → session.pushQueue(items)
  → LearningView renders active item → user answers
  → skill composable calls engine/registry evaluate → store.updateProgress(...)
  → queue empty → learningStore.markSkillCompleted(activeSkillId)
  → all completed → finish screen / back to Skill Selection
```

---

## 6. Routing Requirements (from business rules)

| Path | View | Guards / behavior |
| --- | --- | --- |
| `/` | HomeView | loads collections (cache-first) |
| `/collection/:collectionId/words` | WordManagementView | requires `selectedCollectionId` (set from route param) |
| `/learn/select-words` | WordSelectionView | requires selected collection; restores `selectedWordIds` |
| `/learn/select-skills` | SkillSelectionView | requires ≥4 selected words |
| `/learn/:skillId` | LearningView | requires `learningSession`; unknown id → redirect back |
| `:catchAll(.*)` | NotFoundView | graceful 404 |

- Back behavior is **state-driven** (BR-70…72), not merely `router.back()`; the header Back button maps
  to the documented previous screen of the current flow.
- Guards are permissive: they redirect to the earliest screen with missing precondition and **keep**
  the stores intact so the user never loses work.

## 7. Skill Extensibility (How to add a 5th skill)

The registry pattern keeps the core stable:

```
engine/registry.js
  registry.define(SKILL_ID, {
    meta:   { id, label, description, icon },
    maxSamePrompts: 1,                 // optional
    generate(words, opts) → Item[],   // pure
    evaluate(item, answer) → { correct, expected },  // pure
    shuffle: true,
  })
```

Adding a skill = produce **`meta` + `generate` + `evaluate`** and register it. The core
(`LearningSession`, queue, progress, stats, randomization) and every existing skill stay untouched.
UI side: add `<SkillIdGame.vue>`, register it in `LearningView`'s skill-host map, add a card in the
Skill Picker. Nothing in the engine changes.

Guarantees enforced by the interface:
- Items are **plain serializable data** (safe for snapshotting).
- Evaluation is **pure** (same item + answer → same result) so stats are reproducible in tests.
- The session never knows a skill's internal item shape beyond the generic `{ id, skillId, payload, correctCount }` fields required for queue/progress.

---

## 8. Coding Conventions (aligned with AGENTS.md)

- **Naming**: `camelCase` for variables/functions; `PascalCase` for components/classes; constants
  `UPPER_SNAKE`. Store names: `collectionsStore`, `wordsStore`, `learningStore`, `uiStore`.
- **Skill identifiers** are the stable string constants `FLASH_CARD`, `MULTIPLE_CHOICE`, `LISTENING`,
  `TYPING` (from `engine/core/constants.js`), imported everywhere — never literal strings scattered in views.
- **No giant files**: split SFCs when template/script/style exceed ~300 lines.
- **Vue components**: `<script setup>`; props camelCase; emit names as verb phrases (`emit('save')`).
- **CSS**: Bootstrap for layout/components; custom tokens in `:root` CSS variables; all learning-screen
  layout must use `100dvh`-based containers (`min-height: 100dvh`, `height: 100dvh`) for mobile safety.
- **Error handling**: wrap repository calls in try/catch at service layer; maps error → user toast via
  `uiStore`.

---

*End of architecture. Cross-references: `state-management.md`, `cache-strategy.md`, `learning-engine.md`,
`implementation-plan.md`.*