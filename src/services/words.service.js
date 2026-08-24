// Words domain service (docs/architecture.md §2/§4).
//
// Layering per project rule:  Store → Service → Repository(Firebase).
// This module is a pure orchestrator of validation + persistence. It does NOT
// import any Pinia store; the store applies cache updates from the results
// (including the cache-move rule BR-23 when collectionId changes).

import { validateWord } from '@/lib/validators'
import { uuid } from '@/lib/uuid'
import { nowIso } from '@/lib/datetime'
import * as repo from '@/services/firebase/words.repository'

/**
 * Trim + normalize all word fields.
 * @param {Object} input
 */
function normalizeInput(input = {}) {
  return {
    collectionId: String(input.collectionId ?? '').trim(),
    word: String(input.word ?? '').trim(),
    transcription: String(input.transcription ?? '').trim(),
    meaning: String(input.meaning ?? '').trim(),
    example: String(input.example ?? '').trim(),
    type: String(input.type ?? '').trim(),
    topic: String(input.topic ?? '').trim(),
    level: String(input.level ?? '').trim(),
  }
}

/**
 * Build a validated word entity (FR-W05: UUID + createdAt generated here).
 * @param {Object} input  { collectionId, word, transcription, meaning, example, type, topic, level }
 * @returns {{ errors: Object<string,string>, word?: Object }}
 */
export function buildWord(input = {}) {
  const trimmed = normalizeInput(input)
  const errors = validateWord(trimmed)
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    errors: {},
    word: { id: uuid(), createdAt: nowIso(), ...trimmed },
  }
}

/**
 * Fetch all words of a collection (FR-W01). Throws on failure — the store
 * sets fetchState='error' and surfaces retry UI.
 * @param {string} collectionId
 * @returns {Promise<Object[]>}
 */
export async function fetchWords(collectionId) {
  return repo.getByCollection(collectionId)
}

/**
 * Persist a new word (FR-W05). On validation failure returns errors without
 * touching Firebase.
 * @param {Object} input
 * @returns {Promise<{ok: true, word: Object}|{ok: false, errors: Object}>}
 */
export async function createWord(input) {
  const { errors, word } = buildWord(input)
  if (!word) return { ok: false, errors }

  try {
    const saved = await repo.create(word)
    return { ok: true, word: saved }
  } catch (error) {
    return { ok: false, errors: { _: error.message || 'Create failed' } }
  }
}

/**
 * Persist an update to a word (FR-W06). All fields except id/createdAt may
 * change, including collectionId (cache-move handled by the store, BR-23).
 * @param {string} id
 * @param {Object} input
 * @returns {Promise<{ok: true, word: Object}|{ok: false, errors: Object}>}
 */
export async function updateWord(id, input) {
  const trimmed = normalizeInput(input)
  const errors = validateWord(trimmed)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  try {
    // Patch excludes id and createdAt (BR-2, FR-W06).
    const saved = await repo.update(id, trimmed)
    return { ok: true, word: saved }
  } catch (error) {
    return { ok: false, errors: { _: error.message || 'Update failed' } }
  }
}

/**
 * Delete a word document (FR-W07).
 * @param {string} id
 * @returns {Promise<{ok: true}|{ok: false, error: string}>}
 */
export async function deleteWord(id) {
  try {
    await repo.remove(id)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message || 'Delete failed' }
  }
}