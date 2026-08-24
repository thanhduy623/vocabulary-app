// Collections domain service (docs/architecture.md §2/§4).
//
// Layering per project rule:  Store → Service → Repository(Firebase).
// This module is a pure orchestrator of validation + persistence. It does NOT
// import any Pinia store; the store applies cache updates from the results.

import { validateCollection, isValidLanguageSymbol } from '@/lib/validators'
import { uuid } from '@/lib/uuid'
import { nowIso } from '@/lib/datetime'
import * as repo from '@/services/firebase/collections.repository'

/**
 * Build a validated collection entity (FR-C02: UUID + createdAt generated here).
 * @param {Object} input  { name, language, symbol }
 * @returns {{ errors: Object<string,string>, collection?: Object }}
 */
export function buildCollection(input = {}) {
  const errors = validateCollection(input)
  if (!errors.symbol && !isValidLanguageSymbol(input.symbol)) {
    errors.symbol = 'Invalid language symbol (e.g. vi, en, zh-CN)'
  }
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const trimmed = {
    name: String(input.name).trim(),
    language: String(input.language).trim(),
    symbol: String(input.symbol).trim(),
  }

  return {
    errors: {},
    collection: {
      id: uuid(),
      createdAt: nowIso(),
      ...trimmed,
    },
  }
}

/**
 * Fetch all collections from Firebase (FR-C01).
 * Throws on failure — the store sets fetchState='error' and surfaces the UI.
 * @returns {Promise<Object[]>}
 */
export async function fetchCollections() {
  const items = await repo.getAll()
  return items
}

/**
 * Persist a new collection (FR-C02). UUID + createdAt are generated in
 * buildCollection. On validation failure returns errors (nothing persisted).
 * @param {Object} input  { name, language, symbol }
 * @returns {Promise<{ok: true, collection: Object}|{ok: false, errors: Object}>}
 */
export async function createCollection(input) {
  const { errors, collection } = buildCollection(input)
  if (!collection) return { ok: false, errors }

  try {
    const saved = await repo.create(collection)
    return { ok: true, collection: saved }
  } catch (error) {
    return { ok: false, errors: { _: error.message || 'Create failed' } }
  }
}

/**
 * Persist an update to a collection (FR-C03). Only name/language/symbol are
 * written; id and createdAt are never part of the patch.
 * @param {string} id
 * @param {Object} input  { name, language, symbol }
 * @returns {Promise<{ok: true, collection: Object}|{ok: false, errors: Object}>}
 */
export async function updateCollection(id, input) {
  const { errors, collection } = buildCollection(input)
  if (!collection) return { ok: false, errors }

  try {
    const patch = {
      name: collection.name,
      language: collection.language,
      symbol: collection.symbol,
    }
    const saved = await repo.update(id, patch)
    return { ok: true, collection: saved }
  } catch (error) {
    return { ok: false, errors: { _: error.message || 'Update failed' } }
  }
}

/**
 * Delete a collection AND cascade-delete all its words (FR-C04/BR-13).
 * @param {string} id
 * @returns {Promise<{ok: true}|{ok: false, error: string}>}
 */
export async function deleteCollection(id) {
  try {
    await repo.remove(id)
    await repo.deleteWordsOf(id)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message || 'Delete failed' }
  }
}