// Collections repository (docs/firebase-schema.md §6).
// Firestore CRUD for collections + cascade word deletion (FR-C01..06).

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
import { mapCollectionDoc, mapWordDoc } from './mappers'

const collectionsCol = collection(db, 'collections')
const wordsCol = collection(db, 'words')

/**
 * Fetch all collections.
 * @returns {Promise<Object[]>}
 */
export async function getAll() {
  const snap = await getDocs(collectionsCol)
  return snap.docs.map(mapCollectionDoc).filter((c) => c !== null)
}

/**
 * Create a collection document (setDoc with the client-generated id).
 * @param {Object} collection  { id, name, language, symbol, createdAt }
 * @returns {Promise<Object>}
 */
export async function create(collection) {
  const ref = doc(collectionsCol, collection.id)
  await setDoc(ref, {
    name: collection.name,
    language: collection.language,
    symbol: collection.symbol,
    createdAt: collection.createdAt,
  })
  return mapCollectionDoc(await getDoc(ref))
}

/**
 * Update a collection document (patch: name/language/symbol only).
 * @param {string} id
 * @param {Object} patch  { name?, language?, symbol? }
 * @returns {Promise<Object>}
 */
export async function update(id, patch) {
  const ref = doc(collectionsCol, id)
  await updateDoc(ref, {
    name: patch.name,
    language: patch.language,
    symbol: patch.symbol,
  })
  return mapCollectionDoc(await getDoc(ref))
}

/**
 * Delete a collection document.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(id) {
  await deleteDoc(doc(collectionsCol, id))
}

/**
 * Cascade: delete every word whose collectionId matches (FR-C04/BR-13).
 * @param {string} collectionId
 * @returns {Promise<void>}
 */
export async function deleteWordsOf(collectionId) {
  const q = query(wordsCol, where('collectionId', '==', collectionId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}