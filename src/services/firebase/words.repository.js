// Words repository (docs/firebase-schema.md §6).
// Firestore CRUD for words. The ONLY words module that imports firebase/*.

import { db } from './init'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from 'firebase/firestore'
import { mapWordDoc } from './mappers'

const wordsCol = collection(db, 'words')

/**
 * Fetch all words of a collection.
 *
 * NOTE: deliberately NO orderBy here — a where+orderBy pair would require a
 * Firestore composite index (collectionId ASC, word ASC). Display sorting is
 * done client-side instead (BR-27 / FR-W04, Intl.Collator 'vi'), so this
 * query needs no extra index.
 *
 * @param {string} collectionId
 * @returns {Promise<Object[]>}
 */
export async function getByCollection(collectionId) {
  const q = query(wordsCol, where('collectionId', '==', collectionId))
  const snap = await getDocs(q)
  return snap.docs.map(mapWordDoc).filter((w) => w !== null)
}

/**
 * Create a word document (setDoc with the client-generated id).
 * @param {Object} word  { id, collectionId, word, transcription, meaning, example, type, topic, level, createdAt }
 * @returns {Promise<Object>}
 */
export async function create(word) {
  const ref = doc(wordsCol, word.id)
  await setDoc(ref, {
    collectionId: word.collectionId,
    word: word.word,
    transcription: word.transcription ?? '',
    meaning: word.meaning,
    example: word.example ?? '',
    type: word.type ?? '',
    topic: word.topic ?? '',
    level: word.level ?? '',
    createdAt: word.createdAt,
  })
  return mapWordDoc(await getDoc(ref))
}

/**
 * Update a word document. Patch must never contain id/createdAt.
 * @param {string} id
 * @param {Object} patch  { collectionId?, word?, transcription?, meaning?, example?, type?, topic?, level? }
 * @returns {Promise<Object>}
 */
export async function update(id, patch) {
  const ref = doc(wordsCol, id)
  await updateDoc(ref, patch)
  return mapWordDoc(await getDoc(ref))
}

/**
 * Delete a word document.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(id) {
  await deleteDoc(doc(wordsCol, id))
}