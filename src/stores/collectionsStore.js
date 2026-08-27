// Collections store (docs/state-management.md §2.1, docs/cache-strategy.md §2).
//
// Layering per project rule:  UI → Store → Service → Repository(Firebase).
// This store orchestrates service calls and applies cache updates. Cache rule:
// Firebase mutation → update cache → UI. No full reload after mutations.

import { defineStore } from 'pinia'
import { sortByLocale } from '@/lib/text'
import * as collectionsService from '@/services/collections.service'
import { useWordsStore } from '@/stores/wordsStore'
import { useLearningStore } from '@/stores/learningStore'
import { useUiStore } from '@/stores/uiStore'

/**
 * @typedef {Object} Collection
 * @property {string} id    UUID
 * @property {string} name
 * @property {string} language
 * @property {string} symbol
 * @property {string} createdAt  ISO-8601
 */

export const useCollectionsStore = defineStore('collections', {
  state: () => ({
    /** @type {Collection[]} */
    collections: [],
    /** True only after the first successful load/mutation snapshot. */
    isCollectionsLoaded: false,
    /** @type {'idle'|'loading'|'error'} */
    fetchState: 'idle',
    /** Root cause of the last failed load, surfaced on error states (§11). */
    fetchError: '',
  }),

  getters: {
    /** @returns {Collection[]} A→Z by name (locale-aware, FR-C01). */
    sortedCollections: (state) => sortByLocale(state.collections, (c) => c.name),

    /** @returns {(id: string) => Collection|undefined} */
    getById: (state) => (id) => state.collections.find((c) => c.id === id),
  },

  actions: {
    /**
     * Cache-first loader (FR-C01): use cache when already loaded, otherwise
     * GET from Firebase via the service layer.
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async ensureLoaded() {
      if (this.isCollectionsLoaded) return { ok: true }

      this.fetchState = 'loading'
      this.fetchError = ''
      try {
        const items = await collectionsService.fetchCollections()
        this.collections = items
        this.isCollectionsLoaded = true
        this.fetchState = 'idle'
        return { ok: true }
      } catch (error) {
        this.fetchState = 'error'
        this.fetchError = error?.message || 'Failed to load collections'
        return { ok: false, error: this.fetchError }
      }
    },

    /**
     * Clear all caches then reload fresh data (header Refresh, BR-74).
     * @returns {Promise<{ok: boolean}>}
     */
    async refresh() {
      this.collections = []
      this.isCollectionsLoaded = false
      this.fetchState = 'idle'
      this.fetchError = ''
      useWordsStore().clearWords()
      return this.ensureLoaded()
    },

    /**
     * Create a collection (FR-C02). Persists via the service, then updates
     * the cache only on success.
     * @param {Object} input  { name, language, symbol }
     * @returns {Promise<{ok: true, collection: Object}|{ok: false, errors: Object}>}
     */
    async createCollection(input) {
      const res = await collectionsService.createCollection(input)
      if (!res.ok) {
        if (res.errors?._) useUiStore().pushToast('danger', res.errors._)
        return res
      }
      this.add(res.collection)
      return res
    },

    /**
     * Update a collection (FR-C03). Cache is updated only after Firebase succeeds.
     * @param {string} id
     * @param {Object} input
     * @returns {Promise<{ok: true, collection: Object}|{ok: false, errors: Object}>}
     */
    async updateCollection(id, input) {
      const existing = this.getById(id)
      if (!existing) {
        return { ok: false, errors: { _: 'Collection not found' } }
      }

      const res = await collectionsService.updateCollection(id, input)
      if (!res.ok) {
        if (res.errors?._) useUiStore().pushToast('danger', res.errors._)
        return res
      }
      this.update(res.collection)
      return res
    },

    /**
     * Delete a collection with cascade word deletion (FR-C04/BR-13).
     * Cache is updated only after Firebase succeeds.
     * @param {string} id
     * @returns {Promise<boolean>} true when deleted
     */
    async deleteCollection(id) {
      const res = await collectionsService.deleteCollection(id)
      if (!res.ok) {
        useUiStore().pushToast('danger', res.error || 'Delete failed')
        return false
      }

      // Cache updates (only after success):
      this.remove(id)
      useWordsStore().removeCollectionData(id)

      // If the deleted collection is currently selected, reset that state (FR-C04/BR-75).
      const learningStore = useLearningStore()
      if (learningStore.selectedCollectionId === id) {
        learningStore.resetLearningContext()
      }
      return true
    },

    /**
     * Add a collection to the cache (FR-C02 cache step).
     * @param {Collection} collection
     */
    add(collection) {
      const existing = this.collections.find((c) => c.id === collection.id)
      if (existing) return
      this.collections.push({
        ...collection,
        id: collection.id,
        createdAt: collection.createdAt,
      })
      this.isCollectionsLoaded = true
    },

    /**
     * Update a collection in the cache by id (FR-C03 cache step).
     * @param {Collection} collection
     */
    update(collection) {
      const idx = this.collections.findIndex((c) => c.id === collection.id)
      if (idx === -1) return
      this.collections[idx] = {
        ...this.collections[idx],
        ...collection,
        id: this.collections[idx].id,
        createdAt: this.collections[idx].createdAt,
      }
    },

    /**
     * Remove a collection by id (FR-C04 cache step).
     * @param {string} id
     */
    remove(id) {
      this.collections = this.collections.filter((c) => c.id !== id)
    },
  },
})