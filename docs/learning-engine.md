# Learning Engine — Vocabulary Learning Web App

> Status: Draft for review. Owner: Logical Engineer.
> **Constraint: the engine is 100% framework-free** (no Vue/Firebase/Pinia imports); it is a pure,
> testable JS domain. The UI consumes it through `src/composables/useLearning.js`.

---

## 1. Goals & Non-Negotiables

1. **Skills are pluggable.** Core (session, queue, stats, randomization) never changes when a skill is
   added/removed (AGENTS.md). A skill is exactly: `{ meta, generate, evaluate }`.
2. **Pure functions.** `generate(words) → Item[]` and `evaluate(item, answer) → { correct, expected }`
   are deterministic given inputs-with-seed (see randomization) — unit-testable without DOM.
3. **Items are plain data.** Serializable JSON; a session snapshot can be inspected and replayed.
4. **The engine owns the retry queue and progress counters.** UI only renders and forwards answers.
5. **Randomization by design**: all items shuffled; options shuffled; retry re-inserts randomly.

## 2. Core Concepts

| Concept | Definition |
| --- | --- |
| `Word` | domain object from `wordsStore` (`{id, collectionId, word, transcription, meaning, example, type, topic, level, createdAt}`) |
| `LearningItem` | one atomic activity: `{ id: uuid, skillId, template, prompt, payload, sourceWordId }` |
| `Answer` | user's response: `{ itemId, value }` or `{ itemId, optionId }` |
| `LearningSession` | per-`startSession` snapshot: collection, words snapshot, skill plans, progress, seeded randomness |
| `retryQueue` | recurring bag of items that the learner has not yet mastered |

## 3. Skill Registry Contract

```js
// engine/registry.js
SKILLS = {
  FLASH_CARD: {
    meta:      { id: 'FLASH_CARD', label: 'Thẻ nhớ', description: '...', icon: 'cards' },
    generate:  (words, { seed }) => Item[],            // BR-40
    evaluate:  (item, answer) => { correct, expected },// used by MCQ/listening/typing
  },
  MULTIPLE_CHOICE: { meta, generate, evaluate, hasFeedback: true },
  LISTENING:       { meta, generate, evaluate, hasFeedback: true, needsAudio: true },
  TYPING:          { meta, generate, evaluate, hasFeedback: true },
}
```

Common item envelope:

```js
{
  id: 'itm_…',            // UUID, stable across re-queues
  skillId: 'FLASH_CARD',
  template: 'card-word-front',     // skill-specific discriminator
  sourceWordId: 'w_…',
  payload: { front, back, audioText, options, expected },  // skill-specific
  meta:   { attempts: 0 }
}
```

## 4. Item Generators (exact per BR-40…52)

### 4.1 FLASH_CARD — 3 cards per word (BR-40)

```
for each word w (shuffled):
  detail = { transcription, meaning, example, type, topic, level }  // area shown on BACK
  card1 { template:'card-front-word',          front: w.word,         back: {...detail}, audioText: w.word }
  card2 { template:'card-front-transcription', front: w.transcription, back: {...detail, word}, audioText: w.word }
  card3 { template:'card-front-meaning',       front: w.meaning,      back: {...detail, word}, audioText: w.word }
```
- `front`/`back` may be empty strings if that field is missing → the generator **skips** that template
  for the word (no blank prompts).
- Flip gating is UI logic (BR-41), engine just surfaces the card.
- `evaluate` for flash cards is trivial: `{ correct: true }` — action `Đã nhớ` completes the item;
  `Học lại` sends it back to `retryQueue`.

### 4.2 MULTIPLE_CHOICE — 6 templates per word (BR-44), 4 options each (BR-45)

Template = (promptField, answerField) from the 6 ordered pairs:
`word→transcription, word→meaning, transcription→word, transcription→meaning, meaning→word, meaning→transcription`

```
for each word w (shuffled):
  for each (qField, aField) template:
    prompt = w[qField]
    correct = w[aField]
    pool    = other selected words (exclude w, dedupe by aField value)     // BR-45
    distractors = pickDistractors(pool.map(x=>x[aField]), 3)              // fallbacks if pool<3: reuse unique strings
    options = shuffle([correct, ...distractors])
    item { template:`mcq-${qField}-${aField}`, prompt, options, expected: correct }
```
- `pickDistractors` never returns duplicate option strings; if the session has ≥4 words, 4 distinct
  options are always reachable (AMB-5).
- `evaluate(item, optionId)` → compare resolved option text to `expected`.

### 4.3 LISTENING — 3 templates per word (BR-48)

```
for each word in { shuffle: 3 passes to get variety }:
  audioText = w.word            // TTS always reads the word text (AMB-2)
  for target of ['word','transcription','meaning']:
    prompt   = { audio: audioText, lang }    // lang from collection.symbol
    options  = 4 shuffled values of target field (correct + 3 distractors)
    item { template:`listen→${target}`, prompt:{audioText}, options, expected: w[target] }
```
- Auto-play on entering the question and `.replay()` call are UI responsibilities via
  `src/services/audio.service.js`.
- If collection has no symbol / no voice → engine still works (text comparison); UI shows a TTS warning.

### 4.4 TYPING — 3 templates per word (BR-50)

```
key→target: (word→transcription, transcription→word, meaning→word)
item { template:`type-${keyField}-${targetField}`, prompt: w[keyField], expected: w[targetField] }
evaluate: normalizeUser(typed) === normalizeCompare(expected)   // trim, lowercase, diacritic fold flag
```

---

## 5. LearningSession Model

```js
class LearningSession {
  id, collectionId, wordIds, startedAt,
  skills: { [skillId]: {
      total, completed: 0, correct: 0, incorrect: 0,
      queue: [],                // items not yet mastered (incl. retries)
      active: null,             // current item
      status: 'pending'|'active'|'completed'
  }},
  selectedSkillOrder: [...],    // same order as selection
}
```

API (pure, no I/O):
- `startSession({wordIds, skillIds, words, seed})` → builds plans per skill (generators), shuffles.
- `current(activeSkillId)` → active item
- `submitAnswer(activeSkillId, answer)` → evaluates, mutates counters + queue:
  - correct → `completed++`, `correct++`, remove item, `active = queue[0]` (or null → skill completed)
  - wrong → `incorrect++`, push item to `retryQueue` end, `active = next`
- `retry(activeSkillId)` (flash cards) → equivalent of wrong w/o counter? **Decision**: `Học lại`
  increments `incorrect` count (it is a non-success attempt) and re-queues.
- `getProgress(activeSkillId)` → `{ total, completed, remaining: queue.length, correct, incorrect }`

## 6. Randomization

- **Seedable RNG** via a small utility (`engine/core/math.js`, mulberry32 or similar) — one seed per
  session enables replay & tests; UIs never depend on ordering.
- Item order, option order, retry re-insertion position are all RNG-derived.

## 7. Progress semantics (BR-60…62)

| Stat | Formula |
| --- | --- |
| `total` | initial generator output size for the skill |
| `completed` | items the learner has mastered (successfully answered / Đã nhớ) |
| `remaining` | `queue.length` (active + pending + retries) |
| `correct` / `incorrect` | **attempt counters**, increment per attempt outcome; retries count again |
| `progressBar` | `completed / total` |

- A skill flips to `completed` when `queue.length === 0 && active === null` (BR-63).
- Session complete when every selected skill status is `completed` (BR-64).

## 8. Integration Points (store / composable)

```
startSession flow:
  learningStore.selectCollection(collId)
     → wordsStore.ensureWords(collId) → selectedWordIds (≥4)
     → skillSelection.setSelectedSkillIds(ids·≥1)
     → useLearning.startSession():
          words = wordsStore.wordsOf(collId).filter(id ∈ selectedWordIds)
          snapshot = engine.LearningSession.startSession({ wordIds, skillIds, words })
          learningStore.learningSession = snapshot
          learningStore.setActiveSkill(snapshot.selectedSkillOrder[0])
     → router.push(`/learn/${activeSkillId}`)

answer flow:
  useLearning.answer(userAnswer) → engine submitAnswer(activeSkillId, answer)
     → learningStore.updateLearningSession(snapshot)   // one rehydrate
     → if skill completed → markSkillCompleted
     → if all done → show complete screen
     → else active = next uncompleted skill or next item
```

## 9. Extensibility — adding a 5th skill

Minimal contract to add `SPELLING` (hypothetical):

1. `engine/skills/spelling.js`: `generate(words)` + `evaluate(item, answer)`.
2. `engine/registry.js`: import + register with `meta`.
3. UI: `components/learning/skills/SpellingGame.vue`; add to `LearningView` skill-host map and to the
   Skill Picker (cards driven by `SKILLS` iteration — no special-casing needed).
4. `core/constants.js` gains `SKILLS.SPELLING` (enum list) → skill chips auto-appear.

No changes to `session.js`, queue, stats, or other skills.

## 10. Edge Cases Handled

| Case | Engine response |
| --- | --- |
| A session word is deleted/updated mid-session | snapshot is an independent copy; the current session keeps its starting snapshot (fresh selection rebuilds on restart). |
| `transcription`/`meaning` empty | generator skips blank-prompt templates; listener target can still be blank-answer → **excluded** from distractor pools (AMB-8). |
| Fewer than 4 words | Skill Selection is unreachable (BR-32): handled at selection, not in engine. |
| Duplicate option values | `pickDistractors` de-dupes; final options unique iff source pool allows; otherwise the item falls back to a unique set with re-roll attempts. |
| TTS unavailable (AMB-12) | `audio.service` returns `{ ok:false, reason }`; component shows a replay/fallback hint but **keeps the question functional** (answer by choosing from options). |
| Re-answered item stats | `incorrect`/`correct` track attempts (BR-62) — visible in stats, driven solely by `submitAnswer`. |

## 11. Why This Design Satisfies Requirements

- Retry-queue, randomization, progress → §5–7. 
- Modular skills without core rewrites → §1, §3, §8.
- Flash card flip gating, MCQ/listening/typing show-correct, re-appear-randomly → BR-40…52.
- Engine purity → testability + flexibility to add #future skills quickly.

---

*End of learning engine. Cross-references: `state-management.md` (§2.3 store→engine), `business-rules.md` (§4.1), `analysis.md`.*