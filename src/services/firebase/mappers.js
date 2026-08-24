// Firestore ↔ domain mappers (docs/architecture.md §4).
// Guarantee domain objects always carry `id` and plain ISO `createdAt`.
// Skeleton only — full mapping arrives with the CRUD phase.

/**
 * Map a Firestore snapshot (doc) to a domain collection.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {Object|null}
 */
export function mapCollectionDoc(doc) {
  if (!doc.exists) return null
  const data = doc.data()
  return {
    id: doc.id,
    name: data.name ?? '',
    language: data.language ?? '',
    symbol: data.symbol ?? '',
    createdAt: data.createdAt ?? '',
  }
}

/**
 * Map a Firestore snapshot (doc) to a domain word.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {Object|null}
 */
export function mapWordDoc(doc) {
  if (!doc.exists) return null
  const data = doc.data()
  return {
    id: doc.id,
    collectionId: data.collectionId ?? '',
    word: data.word ?? '',
    transcription: data.transcription ?? '',
    meaning: data.meaning ?? '',
    example: data.example ?? '',
    type: data.type ?? '',
    topic: data.topic ?? '',
    level: data.level ?? '',
    createdAt: data.createdAt ?? '',
  }
}