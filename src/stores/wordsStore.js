// Words store (docs/state-management.md §2.2, docs/cache-strategy.md §2).
//
// Layering per project rule:  UI → Store → Service → Repository(Firebase).
// This store orchestrates service calls and applies cache updates. Cache rule:
// Firebase mutation → update cache → UI. No reload after mutations.

import { defineStore } from 'pinia'
import * as wordsService from '@/services/words.service'
import { useUiStore } from '@/stores/uiStore'
import { useLearningStore } from '@/stores/learningStore'

/**
 * @typedef {Object} Word
 * @property {string} id            UUID
 * @property {string} collectionId  FK to a collection id
 * @property {string} word
 * @property {string} [transcription]
 * @property {string} meaning
 * @property {string} [example]
 * @property {string} [type]
 * @property {string} [topic]
 * @property {string} [level]
 * @property {string} createdAt     ISO-8601
 */

function deDuplicate(values) {
  return [...new Set([...values].filter((v) => v && v.trim()))]
}

export const useWordsStore = defineStore('words', {
  state: () => ({
    /** @type {Record<string, Word[]>} */
    wordsByCollection: {},
    /** @type {string[]} collectionIds whose words are cached */
    loadedWordCollectionIds: [],
    /** @type {Record<string, 'idle'|'loading'|'error'>} */
    fetchStateByCollection: {},
    /** @type {Record<string, string>} last fetch error message per collection */
    fetchErrorByCollection: {},
  }),

  getters: {
    /**
     * Read-only cached words for a collection.
     * @returns {(collectionId: string) => Word[]}
     */
    wordsOf:
      (state) =>
      (collectionId) =>
        state.wordsByCollection[collectionId] || [],

    /**
     * De-duplicated filter options for type/topic/level (FR-W03).
     * @returns {(collectionId: string) => {type: string[], topic: string[], level: string[]}}
     */
    filterOptions:
      (state) =>
      (collectionId) => {
        const words = state.wordsByCollection[collectionId] || []
        return {
          type: deDuplicate(words.map((w) => w.type)),
          topic: deDuplicate(words.map((w) => w.topic)),
          level: deDuplicate(words.map((w) => w.level)),
        }
      },

    /** @returns {boolean} whether a collection's words are cached */
    isLoaded: (state) => (collectionId) =>
      state.loadedWordCollectionIds.includes(collectionId),
  },

  actions: {
    /**
     * Cache-first word loader (FR-W01): use cache when loaded, otherwise
     * GET from Firebase via the service layer.
     * @param {string} collectionId
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async ensureWords(collectionId) {
      if (!collectionId) return { ok: false, error: 'No collection selected' }
      if (this.isLoaded(collectionId)) return { ok: true }

      this.fetchStateByCollection[collectionId] = 'loading'
      try {
        const words = await wordsService.fetchWords(collectionId)
        this.setWords(collectionId, words)
        return { ok: true }
      } catch (error) {
        // Surface the real cause (e.g. missing Firestore index, permission-denied)
        // instead of failing silently.
        console.error(`[wordsStore] Failed to load words for ${collectionId}:`, error)
        this.fetchStateByCollection[collectionId] = 'error'
        this.fetchErrorByCollection[collectionId] =
          error?.message || 'Failed to load words'
        return { ok: false, error: error.message || 'Failed to load words' }
      }
    },

    /**
     * Create a word (FR-W05). Persists via the service, then updates the
     * cache only on success.
     * @param {Object} input
     * @returns {Promise<{ok: true, word: Object}|{ok: false, errors: Object}>}
     */
    async createWord(input) {
      const res = await wordsService.createWord(input)
      if (!res.ok) {
        if (res.errors?._) useUiStore().pushToast('danger', res.errors._)
        return res
      }
      this.addWord(res.word)
      return res
    },

    /**
     * Update a word (FR-W06, BR-22). Applies cache-move (BR-23) when the
     * collection changed. Cache updated only after Firebase succeeds.
     * @param {string} id
     * @param {Object} input
     * @returns {Promise<{ok: true, word: Object}|{ok: false, errors: Object}>}
     */
    async updateWord(id, input) {
      const prev = this.findWordById(id)
      if (!prev) {
        return { ok: false, errors: { _: 'Word not found' } }
      }

      const res = await wordsService.updateWord(id, input)
      if (!res.ok) {
        if (res.errors?._) useUiStore().pushToast('danger', res.errors._)
        return res
      }

      const next = { ...res.word, id, createdAt: prev.createdAt }
      this.applyWordCacheUpdate(next, prev) // handles cache-move (BR-23)
      return { ok: true, word: next }
    },

    /**
     * Delete a word (FR-W07). Cache updated only after Firebase succeeds.
     * @param {string} collectionId  current bucket of the word
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async deleteWord(collectionId, id) {
      const res = await wordsService.deleteWord(id)
      if (!res.ok) {
        useUiStore().pushToast('danger', res.error || 'Delete failed')
        return false
      }
      this.removeWord(collectionId, id)

      // Keep study selections consistent with the cache (word no longer exists).
      const learningStore = useLearningStore()
      learningStore.setSelectedWordIds(
        learningStore.selectedWordIds.filter((wid) => wid !== id),
      )
      return true
    },

    /**
     * Find a cached word by id across all loaded buckets.
     * @param {string} id
     * @returns {Word|undefined}
     */
    findWordById(id) {
      for (const collectionId of Object.keys(this.wordsByCollection)) {
        const found = this.wordsByCollection[collectionId]?.find((w) => w.id === id)
        if (found) return found
      }
      return undefined
    },

    /**
     * Store words for a collection and mark it loaded.
     * @param {string} collectionId
     * @param {Word[]} words
     */
    setWords(collectionId, words) {
      this.wordsByCollection = {
        ...this.wordsByCollection,
        [collectionId]: [...words],
      }
      if (!this.loadedWordCollectionIds.includes(collectionId)) {
        this.loadedWordCollectionIds.push(collectionId)
      }
      this.fetchStateByCollection[collectionId] = 'idle'
      delete this.fetchErrorByCollection[collectionId]
    },

    /**
     * Add a word to the cache bucket (FR-W05).
     * @param {Word} word
     */
    addWord(word) {
      const bucket = this.wordsByCollection[word.collectionId] || []
      this.wordsByCollection = {
        ...this.wordsByCollection,
        [word.collectionId]: [...bucket, word],
      }
    },

    /**
     * Cache-level update primitive (BR-22, FR-W06). Handles cache-move
     * (BR-23) when the collectionId changes.
     *
     * ⚠️ Deliberately named differently from the orchestration action
     * `updateWord(id, input)` above: two keys with the same name in this
     * actions object would silently override each other (the last wins).
     *
     * @param {Word} nextWord
     * @param {Word} prevWord
     */
    applyWordCacheUpdate(nextWord, prevWord) {
      if (prevWord.collectionId !== nextWord.collectionId) {
        // Cache-move rule (BR-23): remove from old bucket, add to new one.
        this.removeWord(prevWord.collectionId, prevWord.id)
        this.addWord(nextWord)
        return
      }

      const bucket = this.wordsByCollection[prevWord.collectionId]
      if (!bucket) return
      this.wordsByCollection[prevWord.collectionId] = bucket.map((w) =>
        w.id === nextWord.id ? { ...w, ...nextWord } : w,
      )
    },

    /**
     * Remove a word from a bucket (FR-W07).
     * @param {string} collectionId
     * @param {string} wordId
     */
    removeWord(collectionId, wordId) {
      const bucket = this.wordsByCollection[collectionId]
      if (!bucket) return
      this.wordsByCollection[collectionId] = bucket.filter((w) => w.id !== wordId)
    },

    /**
     * Drop an entire collection's cached words (AMB-14, cascade delete).
     * @param {string} collectionId
     */
    removeCollectionData(collectionId) {
      const next = { ...this.wordsByCollection }
      delete next[collectionId]
      this.wordsByCollection = next
      this.loadedWordCollectionIds = this.loadedWordCollectionIds.filter(
        (id) => id !== collectionId,
      )
      const fetchState = { ...this.fetchStateByCollection }
      delete fetchState[collectionId]
      this.fetchStateByCollection = fetchState
      const fetchErrors = { ...this.fetchErrorByCollection }
      delete fetchErrors[collectionId]
      this.fetchErrorByCollection = fetchErrors
    },

    /** Clear all word caches (header Refresh, BR-74). */
    clearWords() {
      this.wordsByCollection = {}
      this.loadedWordCollectionIds = []
      this.fetchStateByCollection = {}
      this.fetchErrorByCollection = {}
    },
  },
})