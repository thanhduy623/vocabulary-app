# State Management — Vocabulary Learning Web App

> Status: Draft for review. Owner: Logical Engineer.
> Framework: Pinia (Vue 3). Scope: stores, shapes, invariants, transitions.

---

## 1. Design Principles

- **One store per domain**: `collectionsStore`, `wordsStore`, `learningStore`, `uiStore`.
- State names follow `requirements.md` §I / §21 precisely — **no ad-hoc names** like
  `list_words_of_collection_123`, `indexCollection`, or `isFlashCard`.
- All entity references by UUID (never array index) (BR-3).
- Caches live in stores but mutations happen through service actions so invalidation is centralized.
- `learningStore` intentionally keeps **separate** `selectedSkillIds`, `activeSkillId`, and
  `completedSkillIds` (BR-73).

---

## 2. Store Shapes

### 2.1 `collectionsStore`

```js
state: {
  collections: [Collection],      // [{ id, name, language, symbol, createdAt }]
  isCollectionsLoaded: false,     // true when a successful GET has been cached
  fetchState: 'idle' | 'loading' | 'error',
}
getters:
  sortedCollections   // A→Z by name (locale-aware) — derived, never mutated
  getById(id)
actions:
  ensureLoaded()                 // cache-first; GET only when !isCollectionsLoaded
  refresh()                      // clear + force reload
  add(collection) / update(collection) / remove(id)
```

Invariants:
- `isCollectionsLoaded === true` ⇒ `collections` is the exact snapshot of the last successful GET/mutation.
- After add/update the list is **re-sorted in the getter only** — stored order can stay insertion order;
  the UI always uses `sortedCollections` (avoids cache-churn re-sorts).

### 2.2 `wordsStore`

```js
state: {
  wordsByCollection: { [collectionId]: [Word] },  // cache buckets (BR-4)
  loadedWordCollectionIds: [],                    // collections whose words are cached (BR-74)
  fetchStateByCollection: { [collectionId]: 'idle'|'loading'|'error' },
}
getters:
  wordsOf(collectionId)              // returns cached array (read-only view)
  wordIdsOf(collectionId)
  filterOptions(collectionId)        // { type: [..dedup], topic: [..], level: [..] } (FR-W03)
actions:
  ensureWords(collectionId)          // cache-first
  addWord(word)                      // pushes into bucket
  updateWord(nextWord, prevWord)     // if collectionId changed → cache-move (BR-23)
  deleteWord(collectionId, wordId)
  removeCollectionData(collectionId) // on cascade delete (AMB-14)
  clearWords()
```

Invariants:
- `loadedWordCollectionIds` must be the exact set of keys of `wordsByCollection` that were fetched OK
  (or mutated since). 
- A word object appears in **exactly one** bucket at any time.
- `filterOptions` is derived from the bucket and re-computed automatically when the bucket changes.

### 2.3 `learningStore`

```js
state: {
  selectedCollectionId: null,  // BR-30
  selectedWordIds: [],         // scoped to selectedCollectionId (BR-34)
  selectedSkillIds: [],        // 1..N (BR-33)
  activeSkillId: null,         // currently open skill
  completedSkillIds: [],       // finished within current session (BR-63)
  learningSession: null,       // snapshot created at start (see learning-engine.md)
}
getters:
  selectedWords            // words resolved from selectedWordIds (from wordsStore cache)
  canProceedToSkills       // selectedWordIds.length >= MIN_WORDS (4)
  canStart
  activeSkillCompleted     completedSkillIds.includes(activeSkillId)
  isSessionComplete        every selectedSkillIds ∈ completedSkillIds (BR-64)
actions:
  selectCollection(id)
  setSelectedWordIds(ids) / toggleWord(id) / selectAll(ids)
  setSelectedSkillIds(ids)
  startSession()           // learning.service.startSession (engine snapshot)
  setActiveSkill(id)
  markSkillCompleted(id)
  advance() / answer(evalResult)   // progresses session queue/stats via engine
  exitSkill()              // resets active skill progress when actually exiting
  backToWordSelection()    // per BR-71
  resetLearningContext()   // per BR-72
```

### 2.4 `uiStore`

```js
state:  { toasts: [], activeModals: 0, appBusy: false }
actions: pushToast(kind, text), dismissToast(id), confirm(config) → Promise<bool>,
         modalOpen() / modalClose()
```

## 3. Learning Flow State Machine

```
                     (start)
                        │
                        ▼
 [HomeView] ────selectCollection──▶ [WordSelectionView]
      ▲                                 │ TIẾP (>= 4 words)
      │ resetLearningContext             ▼
      └────◀─ back to home ═══════ [SkillSelectionView]
                                          │ BẮT ĐẦU (>= 1 skill)
                                          ▼
                                   learningStore.startSession()
                                          │
        ┌─────────────────────────────────┤
        │ setActiveSkill(first selected)  ▼
        │                        [LearningView :skillId]
        │                             │ exit (✕/back)
        │        ┌────────────────────┴────────────┐
        │        ▼                                 ▼
        │   complete skill                  SkillSelectionView (keeps selection)
        │ markSkillCompleted                (BR-70: session/intents preserved)
        │        │
        │        └─ all skills done? ─ yes ─▶ [SessionComplete]
        │              no → pick next selected (uncompleted) skill
        └───────────────────────────────────────────┘
```

Back/state rules encoded in actions (BR-70..72):

| Transition | State mutation |
| --- | --- |
| LearningView → SkillSelection | keep `selectedCollectionId`, `selectedWordIds`, `selectedSkillIds`; if actual exit: clear active skill queue (`learningSession.activeSkillProgress = null`), keep other skills' progress |
| SkillSelection → WordSelection | keep `selectedCollectionId`+`selectedWordIds`; reset `selectedSkillIds`, `completedSkillIds`, `learningSession` |
| WordSelection → Home | `resetLearningContext()` — clears all five learning states |

## 4. Loading / Error State Convention

- Every async read owns a `fetchState` entry (`idle|loading|error|ok`). `loading` renders the shared
  `Spinner`; `error` renders `EmptyState` with a retry button — **no infinite spinners** (FR-X07).
- Mutations never block the UI: modal bottom bar shows a small inline "saving…" while `uiStore.appBusy`.
- Toast feedback drives all error surfaces (`uiStore.pushToast('danger', msg)`).

## 5. Persistence & Hydration

- **In-memory only** (AMB-9). Pinia state resets on page reload; Refresh button intentionally clears it.
- No persistence plugin is planned in Phase 0–6. If required later, the cleanest path is `pinia-plugin-persistedstate`
  applied **selectively** (collections + selectedCollectionId + wordsByCollection), never `learningSession`.

## 6. Why This Shape (#contradictions avoided)

- No `indexCollection`/`selectedIndex` anywhere — deletion and sorting must not shift identity (FR-C01/#13).
- `selectedWordIds` is a plain array of UUIDs (ordered by user selection), independent from the word list,
  so filtering/sorting the list never disturbs the selection.
- `wordsByCollection` buckets make the cache-move rule (BR-23) trivially testable.
- UI never derives cross-screen decisions from component-local refs — all flows are store-driven so the
  Back control (FR-X02) and Refresh (FR-X01) stay safe.

---

*End of state management. Cross-references: `cache-strategy.md`, `learning-engine.md`, `architecture.md`.*