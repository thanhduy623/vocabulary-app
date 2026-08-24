# Cache Strategy — Vocabulary Learning Web App

> Status: Draft for review. Owner: Logical Engineer.
> Source: `requirements.md` §I (Nguyên tắc cache), AGENTS.md §Cache.

---

## 1. Goals

1. **Cache-first reads** — if valid data exists in a store, never hit Firebase again (FR-W01, BR-74).
2. **Mutation-first writes** — after a successful Firebase mutation the cache is updated locally and the
   UI re-renders; a full database reload is forbidden (BR-16, NFR-3).
3. **Deterministic invalidation** — every mutation has an explicit cache effect table (below).
4. **User-controlled purge** — the header Refresh button resets the caches and reloads fresh data
   (FR-X01, BR-74) to resolve any out-of-sync concern the user has.

## 2. Cache Model

Two dedicated in-memory caches live in Pinia stores:

| Cache | Owner | Shape | Validity flag |
| --- | --- | --- | --- |
| Collections | `collectionsStore` | `collections: [{id,name,language,symbol,createdAt}]` | `isCollectionsLoaded` (true only after first successful load/mutation snapshot) |
| Words per collection | `wordsStore` | `wordsByCollection: { [collectionId]: [Word] }` | `loadedWordCollectionIds: [collectionId]` |

Everything else (`selectedWordIds`, `learningSession`, filters…) is **selection/session state**, not a
cache — never persisted here.

## 3. Read Path (pseudo)

```
readCollections():
  if collectionsStore.isCollectionsLoaded → return store copy
  else → repo.getCollections() → store.setAll(sorted?) → return

readWords(collectionId):
  if loadedWordCollectionIds.includes(collectionId) → return bucket copy
  else → repo.getWordsByCollection(collectionId) → push bucket + id into loaded list → return
```

- `loading`/`error` states are tracked per key (`fetchState*`) so the UI can show spinner/retry.
- On **error**: do not mark as loaded; the retry button simply re-enters the path.
- **Refresh** (header): `resetCaches()` clears both caches and flags, then re-runs the read paths for
  whatever the current screen needs.

## 4. Write Path & Invalidation Table

Rule: **Firebase mutation succeeds → update cache → UI updates.** If the mutation fails, cache is never
touched and a toast is raised.

| Mutation | Cache side-effects (exact list) |
| --- | --- |
| Create collection | `collections.push(new)` (flag already true) — no GET |
| Update collection | find by `id` and patch fields — no GET, no re-sort needed (getter sorts) |
| Delete collection | (1) remove from `collections`; (2) `loadedWordCollectionIds` remove id; (3) delete `wordsByCollection[id]`; (4) if `selectedCollectionId === id` → reset selection + session (BR-75) |
| Create word | push into `wordsByCollection[collectionId]`; ensure the bucket id appears in `loadedWordCollectionIds`; filter options update automatically |
| Update word (same collection) | replace bucket object by id |
| Update word **moved to another collection** | **cache-move (BR-23)**: remove from old bucket, insert into new bucket; if old bucket becomes empty it still stays cached (empty is a valid snapshot) |
| Delete word | remove from bucket by id; if `selectedWordIds` contains it → remove from selection too (word no longer exists) |
| Refresh button | `clearCollections()` + `clearWords()` + re-enter read path. `selectedWordIds` kept only if ids still valid in reloaded data (filter intersection) |

## 5. Invariants

- **No blind reloads.** After any successful mutation the caches are the **authoritative mirror** of
  what's on Firebase for the touched data (single-user assumption; see §7).
- Buckets are never half-populated: a bucket becomes "loaded" only after the full query resolves.
- `loadedWordCollectionIds` and `wordsByCollection` keys are always in sync (AMB-14).
- Sort is presentation-only (getters) — the cache never re-sorts itself, so mutations are O(1)-ish.

## 6. SSR / Multi-Tab / Concurrency Notes

- Single browser tab is assumed. Multi-tab or external edits may desync; the Refresh button is the
  official mechanism to resynchronize (BR-74).
- All repository reads/writes use Firestore SDK v9 modular calls; no Firestore `onSnapshot` listeners in
  the base version — polling would break the "no unnecessary GET" rule. Future live-sync feature can opt in.

## 7. Security & Size

- The cache holds plain domain data only (no tokens/secrets) — nothing sensitive to scrub.
- Budget: thousands of words per collection is fine in memory; no pagination required for the expected
  personal-use scale (NFR-7). If a collection grows past ~2k words, pagination can be added to the
  words repository + store without touching the UI contract.

---

*End of cache strategy. Cross-references: `state-management.md` (store shapes), `business-rules.md`.*