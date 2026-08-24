# Firebase Schema — Vocabulary Learning Web App

> Status: Draft for review. Owner: Database Engineer.
> Decision proposed: **Cloud Firestore** (AMB-1). Rationale and schema below.

---

## 1. Security Baseline (READ FIRST)

- **NEVER ship Admin SDK credentials in the frontend.** The repo's `study-vocalubary-db.json` contains a
  service-account private key (SEC-1). It must be revoked and excluded via `.gitignore`, and **must not**
  be imported anywhere.
- The app uses the **Firebase Web SDK (v9/v10 modular)** with the **public** project config, fed through
  environment variables (`VITE_FIREBASE_*`) or a `src/firebase/config.js` checked-in with public values.
- Authorization protection comes from **Firestore Security Rules** (§5) — treat every document as
  world-readable/writable unless rules deny it. For this single-user personal app the initial rule is
  *allow all authenticated*; the product has no login yet, so we ship **open rules** here behind an
  explicit caveat, with a documented upgrade path when login is introduced.

| Concern | Decided approach |
| --- | --- |
| DB type | **Cloud Firestore** (query power, ordering, near-real-time, auto-scaling) — AMB-1 |
| SDK | `firebase` v9/v10 modular (compat-free imports) |
| Date/timestamps | Store ISO-8601 **strings** (`createdAt`) — simplest, serializable, timezone-naive UTC; avoids Timestamp conversion across layers |
| IDs | Client-generated UUID v4 stored as **document IDs** |

---

## 2. Firestore Data Model — collections

Top-level collections:

```
/firestore
├── collections/{collectionId}          // one doc per learning collection
│     name: string
│     language: string
│     symbol: string                  // ISO-ish code for TTS: 'vi', 'cn', 'en'…
│     createdAt: string               // ISO 8601 (UTC)
│
├── words/{wordId}                    // one doc per word (flat, not subcollection)
│     collectionId: string            // ← FK to collections doc id
│     word: string
│     transcription: string
│     meaning: string
│     example: string
│     type: string                    // free-form taxonomy
│     topic: string
│     level: string
│     createdAt: string               // ISO 8601 (UTC)
```

Why a **flat `words` collection** with `collectionId` field (vs. `collections/{id}/words` as subcollection):
- One query `words where collectionId == X` returns the full list — simple, cacheable, matches the
  "get entire word list of a collection" requirement.
- Cascade delete collection → delete each word is a `WriteBatch` on word ids; acceptable,
  and it keeps Firestore rules simple.
- Subcollection alternative noted in §7 for very large collections (future).

---

## 3. Field-Level Contract

| Field | Type | Required | Constraints | Updatable |
| --- | --- | --- | --- | --- |
| `collections.name` | string | yes | trimmed, 1..100 | yes (BR-12) |
| `collections.language` | string | yes | 1..100 | yes |
| `collections.symbol` | string | yes | matches `/^[a-z]{2,3}(-[A-Z]{2})?$/` style (vi, en, vi-VN, zh-CN) | yes |
| `collections.createdAt` | string (ISO) | yes | immutable | no |
| `words.collectionId` | string (UUID) | yes | must exist (enforced in service; rules enforce non-empty) | yes |
| `words.word` | string | yes | 1..200 | yes |
| `words.transcription` | string | no | can be empty `''` | yes |
| `words.meaning` | string | yes | 1..1000 | yes |
| `words.example` | string | no | can be empty | yes |
| `words.type/topic/level` | string | no | can be empty; free-form; combobox suggestions from collection | yes |
| `words.createdAt` | string (ISO) | yes | immutable | no |

## 4. Queries & Indexes

Required query patterns (all pass through `src/services/firebase/`):

| Purpose | Query | Index needed |
| --- | --- | --- |
| Home list | `collections` orderBy `name, created` (then client-side locale sort) | automatic (single-field orderBy) |
| Word list of a collection | `words where collectionId == X orderBy word` | **composite** `(collectionId ASC, word ASC)` — must be created in Firestore console |
| Filter + sort (client-side) | fetch whole collection list once (cache) then filter/sort in JS (FR-W04, BR-27) | none |
| Cascade delete | `words where collectionId == X` → batch delete | same composite above |

Notes:
- Firestore **`!=`/array-contains / in`** quirk: `in` queries require explicit indexes too — the composite
  above covers our needs, but if any future query pairs a filter with an order, add the index map.
- `createdAt` is written as ISO string; orderBy on timestamps ("newest word first") should instead use a
  Firestore `Timestamp` field `createdAtTs` if ever needed. Base version keeps ISO strings everywhere.

## 5. Security Rules (initial, permissive-but-sane)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // NOTE (SEC-1 context): single-user dev, no auth yet.
    // When user accounts arrive, replace `true` with `request.auth != null`
    // and owner-field checks (e.g. doc.ownerId == request.auth.uid).
    match /collections/{collectionId} {
      allow read, write: if true;
    }
    match /words/{wordId} {
      allow read, write: if true;
    }
  }
}
```

Hard guards we still enforce in application code (defense-in-depth, since rules are open):
- `collectionId` of a word must reference an existing collection (service-level check on create/update).
- `createdAt`/`id` never accepted from the client payload on update (strip before write).
- No Admin SDK usage anywhere.

Upgrade path (documented): switch to `allow read, write: if request.auth != null && request.auth.uid == ownerUid`,
add `ownerUid` to both doc types, migrate existing data with a one-off script (Firebase CLI + Admin SDK,
run by developer offline — never in the app).

## 6. Repository Contract (data layer)

```
collections.repository.js
  getAll()                  → Promise<Collection[]>            // ordered by name in service
  create(collection)        → Promise<Collection>              // set doc with id
  update(id, patch)         → Promise<Collection>              // patch {name,language,symbol}
  remove(id)                → Promise<void>                    // delete doc
  deleteWordsOf(collectionId) → Promise<void>                  // query + WriteBatch

words.repository.js
  getByCollection(collectionId) → Promise<Word[]>              // where == , orderBy word
  createWord(word)          → Promise<Word>
  updateWord(id, patch)     → Promise<Word>                    // patch never contains id/createdAt
  removeWord(id)            → Promise<void>
```

`mappers.js` guarantees domain objects always carry `id` at the front (Firestore doc id) and plain
ISO `createdAt` strings — services and UI never see Firestore internals.

## 7. Alternative Shapes & Trade-offs

| Option | Verdict | Why |
| --- | --- | --- |
| Realtime Database (`/collections`, `/words`) | Not chosen | Manual `orderByChild('collectionId')` + filtering, weaker query semantics, harder rules — Firestore more professional for this schema. |
| Subcollection `collections/{id}/words` | Rejected (base) | Requires per-collection query anyway; makes "list all words across collections" and cascade delete slightly harder; fine as an upgrade if per-collection write permissions matter later. |
| `words with collectionId` (chosen) | ✅ | Single filter query; simple caching by `collectionId` in `wordsByCollection`; both unit + integration tests trivial. |

## 8. Sample Data (for manual UAT and dev debugging)

Seed via console / script / app's own create-forms:

```
collections/sample-collection-1: { name: 'TOEIC 600', language: 'Tiếng Anh', symbol: 'en', createdAt: '2026-01-01T00:00:00.000Z' }
words: { collectionId: sample-collection-1, word:'abandon', transcription:'/əˈbændən/', meaning:'bỏ rơi', example:'He abandoned his car.', type:'verb', topic:'Daily life', level:'B1', createdAt: ... } × N (≥4 for study)
```

---

*End of Firebase schema. Cross-references: `analysis.md` §6 (SEC-1), `cache-strategy.md`, `architecture.md`.*