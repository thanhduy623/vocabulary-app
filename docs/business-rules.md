# Business Rules — Vocabulary Learning Web App

> Status: Draft for review.
> Owner: Business Analyst / Logical Engineer. Traceability: rule ↔ requirement lines in `requirements.md`.

Rules are grouped by domain and carry stable IDs referenced by tests and implementation.

---

## 1. Entity & Data Integrity Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-1 | Every `collection` and `word` entity has an `id` that is a **UUID generated client-side**. | "ID là uuid tự động của hệ thống" |
| BR-2 | Every entity has a `createdAt` timestamp; it is **immutable** — never editable, never sent in update payloads. | req. createdAt + AGENTS.md |
| BR-3 | Array indexes must never be used as entity identity. All references use entity `id`. | AGENTS.md §State |
| BR-4 | A `word` belongs to exactly one `collection` via its `collectionId` field. | req. Words |
| BR-5 | Duplicate words inside one collection are allowed (no uniqueness rule). De-duplication applies **only** to (a) filter option lists and (b) MCQ/listening distractor pools. | AMB-5 |

## 2. Collection Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-10 | A collection is created with exactly: `name`, `language`, `symbol`. `symbol` is an ISO-style code used for TTS pronunciation (e.g. `vi`, `cn`, `en`). | req. Collections |
| BR-11 | `name`, `language`, `symbol` are required (trimmed, non-empty string). | req. §4 validation |
| BR-12 | Update may change only `name`, `language`, `symbol`. `id` and `createdAt` are immutable and never sent in the update payload. | req. Cập nhật |
| BR-13 | Deleting a collection **cascade-deletes every word** whose `collectionId` equals that collection. The confirmation dialog must explicitly warn about this. | req. Xoá |
| BR-14 | Delete is two-step: click XOÁ → confirmation modal → only on confirm is Firebase called. | req. Xoá |
| BR-15 | Collections list is always sorted **by name A→Z** regardless of create/update order. | req. Xem |
| BR-16 | After successful create/update only the cache is updated and re-sorted; a full `GET collections` reload is forbidden. | req. §Cache |

## 3. Word Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-20 | A word is created with `collectionId`, `word`, `transcription`, `meaning`, `example`, `type`, `topic`, `level` (+ auto `id`, `createdAt`). | req. Tạo |
| BR-21 | `word`, `transcription`, `meaning`, `collectionId` are required; `example`, `type`, `topic`, `level` may be empty. | AMB-8 / validation |
| BR-22 | Update allows changing every field **including `collectionId`**; `id` and `createdAt` are excluded. | req. Cập nhật |
| BR-23 | **Cache-move rule**: when `collectionId` changes, the cache must remove the word from the old bucket and insert it into the new bucket. Updating the object inside the old bucket is forbidden. | req. §8 |
| BR-24 | Word list is sorted by `word` A→Z (locale-aware). | req. §6 |
| BR-25 | `type`/`topic`/`level` inputs are **combobox (dropdown + free text)**. Dropdown options are derived from the current collection's words and are de-duplicated. | req. Words + §6 |
| BR-26 | A new word's `collectionId` defaults to the active collection; user may change it with the cached collections list. | req. §7 |
| BR-27 | Search matches the `word` field only (case-insensitive substring); filters are exact matches; search/filter/sort are client-side, no per-action Firebase calls. | req. §6 |

## 4. Study Flow Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-30 | Study starts only when a collection is selected (`selectedCollectionId` non-empty). | req. §10 |
| BR-31 | The learner must pick **at least 4 words** (`selectedWordIds.length ≥ 4`); the CTA is disabled otherwise. | req. §13 |
| BR-32 | If a collection has fewer than 4 words, `TIẾP` stays disabled and the UI shows a hint ("add at least N more words"). | AMB-6 |
| BR-33 | The learner must select **at least 1 skill** (`selectedSkillIds.length >= 1`); all available skills may be selected. | req. §15 |
| BR-33b | This app uses **single skill selection** and a separate **Skill Options** step: after picking a skill, the learner must select **≥1 option** per skill (`skillOptions[skillId].length >= 1`) before the session may start. Options are template filters (e.g. TYPING: word→transcription / transcription→word / meaning→word); multiple options mix directions randomly. | req. §15 |
| BR-34 | Study selections are scoped to the collection: `selectedWordIds` restores only when returning to word selection for the same `selectedCollectionId`. | req. §11 |
| BR-35 | The session may start ONLY after all preconditions hold (≥4 words, ≥1 skill, ≥1 option per selected skill): snapshot → item generation → randomization → progress/retry init → first skill. | req. §17 |

### 4.1 Per-skill rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-40 | **FLASH_CARD**: 3 cards per word (FRONT word / FRONT transcription / FRONT meaning; BACK carries the other fields + audio). Cards are randomized across all selected words. | req. Kỹ năng 1 |
| BR-41 | A flash card must be **flipped** (click / Enter / Space) before the user may act on it. | req. §2.4.1 |
| BR-42 | Two actions only: `Đã nhớ` (complete, next) and `Học lại` (not complete, re-insert randomly later). | AMB-4 |
| BR-43 | The flash-card skill finishes only when no card remains in the queue. | req. Kỹ năng 1 |
| BR-44 | **MULTIPLE_CHOICE**: 6 templates (Q→A): word→transcription, word→meaning, transcription→word, transcription→meaning, meaning→word, meaning→transcription. | req. Kỹ năng 2 |
| BR-45 | Every MCQ question shows **exactly 4 options**; distractors come from the same field of other selected words (deduplicated). | AMB-5 |
| BR-46 | Correct → option green, learner presses next; wrong → selection red **and the correct answer is revealed**, learn press next; the question re-enters the randomized queue. | req. Kỹ năng 2 |
| BR-47 | MCQ finishes only when all questions are answered correctly (queue empty). | req. Kỹ năng 2 |
| BR-48 | **LISTENING**: 3 types (audio→ word/transcription/meaning). TTS speaks the **word**; language = collection `symbol`; auto-play on entry + replay button. | AMB-2 |
| BR-49 | Listening uses the same 4-option + reveal + retry semantics as MULTIPLE_CHOICE. | req. Kỹ năng 4 |
| BR-50 | **TYPING**: 3 templates (key word→type transcription; key transcription→type word; key meaning→type word). Comparison: trimmed, case-insensitive; optional Unicode diacritic folding behind a config flag. | AMB-13 |
| BR-51 | Typing shows green/red feedback, reveals the correct answer on a miss, next on button; wrong entries re-enter the queue. | req. Kỹ năng 3 |
| BR-52 | Typing finishes when the queue is empty. | req. Kỹ năng 3 |

## 5. Progress & Completion Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-60 | All learning screens show live stats: completed / remaining / total and correct / incorrect. | req. §4 |
| BR-61 | `completed` = distinct items mastered; `remaining` = items in active/retry queue; `total` = initial item count of the skill. | derived |
| BR-62 | correct/incorrect count **answer attempts**; every attempt (including retries) updates them. | derived |
| BR-63 | A skill is added to `completedSkillIds` when its remaining hits zero. | req. §18 |
| BR-64 | The learning session completes when **all** skills in `selectedSkillIds` are completed. | req. §19 |

## 6. State / Navigation Rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-70 | Learning → Skill Selection (back/complete): keep `selectedCollectionId`, `selectedWordIds`, `selectedSkillIds`; only the active skill's progress is discarded when actually exiting it. | req. §20 |
| BR-71 | Skill Selection → Word Selection: keep `selectedCollectionId`; reset `selectedSkillIds` and `learningSession`; `selectedWordIds` may be kept for adjustments. | req. §20 |
| BR-72 | Word Selection → Home: reset the whole learning context (selections + session). | req. §20 |
| BR-73 | `selectedSkillIds`, `activeSkillId`, `completedSkillIds` are three separate states, never merged (no `isFlashCard`-style booleans). | req. §16/§18 |
| BR-74 | Refresh (header) clears all caches and reloads fresh; back navigation never re-fetches when valid state exists. | req. §1 |
| BR-75 | When the active collection is deleted, `selectedCollectionId` is reset and related session data cleaned. | req. §4 |

---

*End of business rules. Cross-references: `analysis.md` (FR-*), `state-management.md`, `cache-strategy.md`.*