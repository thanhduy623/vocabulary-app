# Vocabulary Learning Web App — System Analysis

> Status: Draft for review — awaiting approval before implementation.
> Source of truth: `requirements.md` (634 lines), `AGENTS.md`.
> Companion docs: `business-rules.md`, `architecture.md`, `state-management.md`,
> `cache-strategy.md`, `firebase-schema.md`, `learning-engine.md`, `implementation-plan.md`.

---

## 1. Purpose

This document is the Business Analyst deliverable. It translates the Vietnamese requirements into a
structured requirements inventory, identifies application states, routing, caching, Firebase, learning
engine, and responsive-UI requirements, and flags every ambiguity or contradiction so the team can
resolve them **before** writing application code.

The product: a **professional, modern, frontend-only vocabulary learning web application** that works
on desktop and mobile, stores data in **Firebase** directly from the frontend (no backend), and exposes
an extensible **learning engine** with four initial skills (FLASH_CARD, MULTIPLE_CHOICE, LISTENING, TYPING).

---

## 2. Fixed Constraints (Non-Negotiable)

| Constraint | Detail |
| --- | --- |
| Frontend only | No backend; the frontend talks to Firebase directly. |
| Firebase Web SDK | Public Web SDK config only — **never Admin SDK credentials** (see SEC-1). |
| Vue 3 + Vite + JavaScript | Composition API, `<script setup>`, plain JS. |
| Vue Router + Pinia | Routing and state management. |
| Bootstrap + custom CSS | UI built with Bootstrap plus bespoke CSS. |
| Modular architecture | Small files, separated layers; no giant files. |
| Firebase access isolated in services | Components/stores never import the Firebase SDK directly. |
| Learning engine independent of UI | Engine is plain JS; the UI consumes it. |
| UUID entity IDs; immutable `createdAt` | Never use array indexes as entity IDs. |
| Skills extensible | New skills addable without rewriting the core engine. |

---

## 2. Current Repository State (as-found / greenfield)

- Standard Vite scaffold: `index.html`, `vite.config.js`, `src/main.js`, `src/App.vue`,
  `src/components/HelloWorld.vue`, `src/style.css`, `public/`.
- **Missing**: Vue Router, Pinia, Bootstrap, Firebase — not installed yet.
- `package.json` has only `vue` + Vite tooling; no lint/test config.
- `requirements.md`, `AGENTS.md`, `study-vocalubary-db.json` are untracked in Git.
- ⚠️ **SEC-1 (critical)**: `study-vocalubary-db.json` contains a real Firebase Admin SDK **service
  account private key**. It is **not** covered by `.gitignore` (`git check-ignore` confirms it would
  be committed). See §6.

The project is greenfield: the Vite template is the only existing code. The analysis below specifies
the target architecture the scaffold must grow into.

## 3. Functional Requirements Inventory

IDs (`FR-*`) are referenced by all other documents to trace rules, states, and tests.

### 3.1 Collections subsystem

| ID | Requirement |
| --- | --- |
| FR-C01 | List all collections, sorted by name **A → Z**, rendered as a grid of cards. |
| FR-C02 | Create collection: `name`, `language`, `symbol` (e.g. `vi`, `cn`, `en`). UUID + `createdAt` generated client-side. |
| FR-C03 | Update collection: only `name`, `language`, `symbol`; `id` and `createdAt` immutable. |
| FR-C04 | Delete collection after confirmation; **cascade-delete all its words**; confirmation modal must state this warning. |
| FR-C05 | Collection card actions: `HỌC NGAY` (→ word selection), `TỪ VỰNG` (→ word management), `CẬP NHẬT`, `XOÁ`. |
| FR-C06 | Frontend validation on create/update; invalid input never reaches Firebase; success = mutation → cache update → UI update. |

### 3.2 Words subsystem

| ID | Requirement |
| --- | --- |
| FR-W01 | List all words of a collection (cache-first). |
| FR-W02 | Search words by the `word` field (client-side, case-insensitive substring). |
| FR-W03 | Filter by `type`, `topic`, `level`; option lists derived from the collection's words, de-duplicated. |
| FR-W04 | Sort displayed words by `word` A → Z. |
| FR-W05 | Create word: `id` (UUID), `collectionId`, `word`, `transcription`, `meaning`, `example`, `type`, `topic`, `level`, `createdAt`. |
| FR-W06 | Update word: all fields editable except `id`, `createdAt`; `collectionId` editable — moving a word must relocate it between cache buckets. |
| FR-W07 | Delete word after confirmation modal. |
| FR-W08 | `type`/`topic`/`level` are **comboboxes**: dropdown of existing values from the current collection (deduped) **plus** free typing of a new value. |
| FR-W09 | New word's `collectionId` defaults to the active collection (optionally a selector over cached collections). |

### 3.3 Learning flow

| ID | Requirement |
| --- | --- |
| FR-L01 | Pick a collection on Home → `selectedCollectionId` → Word Selection screen. |
| FR-L02 | Word Selection: per-row checkboxes + Select All; restores prior selection for the same collection; shows `Đã chọn: X / total`; CTA is anchored/sticky. |
| FR-L03 | `TIẾP` enabled only when `selectedWordIds.length ≥ 4`. |
| FR-L04 | Skill Selection: 4 skill cards (FLASH_CARD, MULTIPLE_CHOICE, LISTENING, TYPING); 1..4 selectable; at least 1 required. |
| FR-L04b | Skill Options: after selecting skills, the learner picks ≥1 option per skill (e.g. TYPING: word→transcription, transcription→word, meaning→word). Multi-select mixes the chosen directions randomly into the session. The session officially starts only after options are chosen and "Bắt đầu học" is clicked. |
| FR-L05 | Starting the session snapshots the selection, generates skill items, randomizes, initializes progress + retry queue, lands on first selected skill. |
| FR-L06 | **FLASH_CARD**: 3 card types per word (word→detail, transcription→detail, meaning→detail); flip by click/`Enter`/`Space`; must flip before acting; `Đã nhớ` and `Học lại` buttons; retry cards re-inserted randomly; ends only when all cards mastered. |
| FR-L07 | **MULTIPLE_CHOICE**: 6 question types (word→transcription, word→meaning, transcription→word, transcription→meaning, meaning→word, meaning→transcription); 4 options; instant green/red feedback; correct answer revealed; wrong questions re-inserted randomly; ends only when all are correct. |
| FR-L08 | **LISTENING**: 3 question types (audio→word, audio→transcription, audio→meaning); Web Speech API TTS using collection `symbol`; auto-play on each question; replay button; 4 options; same retry mechanics and reveal-correct. |
| FR-L09 | **TYPING**: 3 question types (key `word` → type `transcription`; key `transcription` → type `word`; key `meaning` → type `word`); normalized comparison; correct → green + next; wrong → red + reveal correct + next; wrong entries re-appear randomly. |
| FR-L10 | Every learning screen shows live progress: completed / total / remaining plus correct / incorrect counts. |
| FR-L11 | Completing a skill returns to Skill Selection with that skill marked completed; session ends only when every selected skill is completed. |
| FR-L12 | Retry queue: wrong/retried items re-inserted randomly; the skill is unfinished while any item remains. |
| FR-L13 | Back navigation rules preserve selection state across screens (see `state-management.md`). |

### 3.4 Cross-cutting / global UX

| ID | Requirement |
| --- | --- |
| FR-X01 | Header: clickable **logo** (→ Home), **refresh** (clear all front caches, refetch from Firebase), **back** (previous screen preserving state). |
| FR-X02 | Every screen has a Back control; navigation must not corrupt in-memory state. |
| FR-X03 | Optimize for desktop, mobile, short/tall viewport, landscape mobile (address-bar collapse) — `svh`/`dvh`, safe layouts. |
| FR-X04 | Touch (large targets ≥44px) and keyboard (Enter/Space flip, number keys for options, Enter submits typing). |
| FR-X05 | CRUD feedback: validation errors keep modal open; success closes modal; toasts show errors. |
| FR-X06 | All learning screens show progress (see FR-L10). |
| FR-X07 | Loading and empty states on every screen (no infinite spinners). |

---

## 4. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Modularity: separated UI / state / business logic / Firebase services / cache / learning engine / utilities; files stay small. |
| NFR-2 | Reusability: shared modal, confirm dialog, toast, empty state, spinner; collection card and word row reused across screens. |
| NFR-3 | Cache hygiene: never re-fetch when a valid cache exists; mutation → cache update → UI (see `cache-strategy.md`). |
| NFR-4 | No pointless network calls: search/filter/sort are client-side. |
| NFR-5 | Responsive + accessible: visible focus, ARIA on modal/confirm/toasts, ≥44px touch targets, keyboard operable. |
| NFR-6 | Security: no secrets in source or Git (see SEC-1); Firestore security rules enforced. |
| NFR-7 | Performance: interaction snappy via cached data (~thousands of words per collection tolerable). |

---

## 5. Main User Scenarios (happy paths)

1. **Manage collections** — Home → create / update / delete collection (modal) → list updates instantly.
2. **Manage words** — Home → `TỪ VỰNG` → list, search, filter, sort → create / update / delete word (modal).
3. **Study** — Home → `HỌC NGAY` → select ≥4 words → select ≥1 skill → learn each skill until mastered →
   Skill Selection → next skill or finish.

**Bad paths**: Firebase down/timeout (toast + retry), validation failures (modal stays open), empty
collection (study blocked, AMB-6), TTS unavailable (fallback hint, AM-12).

---

## 6. Security Findings

### SEC-1 — Firebase Admin service-account private key committed in the repo

- File `study-vocalubary-db.json` (root) contains a real `BEGIN PRIVATE KEY…` service-account key.
- **It must never be used by frontend code.** An Admin SDK key grants full access to the Firebase
  project (DB, Auth, and more) and cannot be kept secret inside a browser bundle — anyone holding it
  can read or wipe the entire database.
- **Mandatory remediation (start of Phase 0):**
  1. Treat the key as compromised → **rotate/revoke** the service-account key in Google Cloud Console.
  2. Add patterns (`*service-account*.json`, `*-db.json`, `*.private.*`, etc.) to `.gitignore` and
     verify with `git check-ignore`.
  3. Use a **public Firebase Web SDK config** (`apiKey`, `authDomain`, `projectId`, …) via
     `import.meta.env.*` — the web API key is not a secret, but real protection comes from
     **Firestore security rules** (see `firebase-schema.md`).
- Note: the requirement's "database.json downloaded from Firebase → connect directly from the
  frontend" must be understood as **using the Firebase Web SDK for CRUD**, never the service-account file.

---

## 7. Ambiguities, Contradictions & Open Decisions

Each item proposes a resolution; sign-off (or an alternative) is required before implementation.

| ID | Question / Ambiguity | Recommendation | Affected doc |
| --- | --- | --- | --- |
| AMB-1 | Firebase database type: Realtime DB vs Cloud Firestore? | **Cloud Firestore** — powerful client queries (`where collectionId == …`, orderBy), fits CRUD + filtering. | `firebase-schema.md` |
| AMB-2 | Does TTS speak the `transcription` too? | TTS always speaks the **word**; only the answer target varies (word/transcription/meaning). | `learning-engine.md` |
| AMB-3 | Sorting rules for Vietnamese/unicode strings? | `Intl.Collator('vi')` / `localeCompare('vi')` for A→Z. | `learning-engine.md` |
| AMB-4 | Flash card: requirements mention both a "tiếp" button and "Đã nhớ / Học lại" buttons. | Two actions only: `Đã nhớ` (complete, next) and `Học lại` (re-queue, next); card must be flipped first. | `learning-engine.md` |
| AMB-5 | Duplicate words inside a collection allowed? | Allowed (no uniqueness rule); dedupe only filter options and MCQ distractor selection. | `business-rules.md` |
| AMB-6 | Collection with < 4 words cannot meet the min-4 rule. | Warn "need ≥4 words to study" and disable `TIẾP`; Skill Selection stays unreachable. | `business-rules.md` |
| AMB-7 | Word search scope? | Only the `word` field (case-insensitive substring); filters are exact 1:1 values. | `business-rules.md` |
| AMB-8 | May `type`/`topic`/`level` be empty? | Yes; empty values are excluded from dropdowns and distractor pools. | `business-rules.md` |
| AMB-9 | Should caches survive a page reload? | No — in-memory only; Refresh clears them. (localStorage is a future enhancement.) | `cache-strategy.md` |
| AMB-10 | Does Word Management also need select-all? | Yes only as **bulk deletion** convenience; the Word Selection page owns study selections. | `business-rules.md` |
| AMB-11 | Update word → move to another collection in UI | Update modal shows a collection select (from cache); save relocates the word between buckets. | `cache-strategy.md` |
| AMB-12 | TTS voice availability across browsers | Feature-detect; show fallback notice; always set `utterance.lang`. | `learning-engine.md` |
| AMB-13 | Answer comparison normalization | TYPING: trim + case-insensitive (+ optional diacritic-fold). MCQ: exact string match on options. | `learning-engine.md` |
| AMB-14 | Delete collection: clean `loadedWordCollectionIds` too? | Yes — remove `wordsByCollection[coll]` **and** the entry in `loadedWordCollectionIds`. | `cache-strategy.md` |

---

## 8. Document Index

| Doc | Owner | Focus |
| --- | --- | --- |
| `business-rules.md` | Business / Logical | Explicit, ID-annotated business rules |
| `architecture.md` | Solution / Frontend | Layers, folder structure, dependency flow, extensibility |
| `state-management.md` | Logical | Pinia stores, state invariants, learning transitions, UI state |
| `cache-strategy.md` | Logical | Cache model, read/write/invalidate paths, refresh semantics |
| `firebase-schema.md` | Database | Firestore schema, queries, indexes, security rules, credentials |
| `learning-engine.md` | Logical | Skill registry, item generation, session, retry queue, progress |
| `implementation-plan.md` | Project | Phase-gated plan, deliverables, acceptance criteria |

---

*End of analysis.*