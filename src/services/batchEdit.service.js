// Batch edit domain logic (one form → per-word update payloads).
//
// Layering per project rule: UI → Store → Service → Repository(Firebase).
// Pure module: decides which fields actually change for a group of words and
// builds the full input each word needs for words.service.updateWord (which
// validates every field, including word/meaning).

/** Trimmed value when the batch field is set, else the word's current value. */
function pickOrKeep(batchValue, currentValue) {
  const value = String(batchValue ?? '').trim()
  return value !== '' ? value : String(currentValue ?? '').trim()
}

/**
 * Apply a batch edit to one word.
 *
 * Rules:
 * - `collectionId` is always applied (the selector always carries a value).
 * - `type` / `topic` / `level` are applied only when the batch value is
 *   non-empty — an empty field means "keep the word's current value".
 * - `word`, `transcription`, `meaning`, `example` are NEVER changed by batch
 *   edit (requirement: only Collection, Type, Topic, Level are batch-editable).
 *
 * @param {Object} word  cached word entity
 * @param {{collectionId: string, type: string, topic: string, level: string}} batch
 * @returns {Object} full input object for words.service.updateWord
 */
export function buildBatchInput(word = {}, batch = {}) {
  return {
    collectionId: String(batch.collectionId ?? word.collectionId ?? '').trim(),
    word: String(word.word ?? '').trim(),
    transcription: String(word.transcription ?? '').trim(),
    meaning: String(word.meaning ?? '').trim(),
    example: String(word.example ?? '').trim(),
    type: pickOrKeep(batch.type, word.type),
    topic: pickOrKeep(batch.topic, word.topic),
    level: pickOrKeep(batch.level, word.level),
  }
}

/**
 * Whether applying the batch changes at least one selected word.
 * Enables the submit button only for real edits (no-op guard).
 * @param {{collectionId: string, type: string, topic: string, level: string}} batch
 * @param {Object[]} words
 * @returns {boolean}
 */
export function hasBatchChanges(batch = {}, words = []) {
  return words.some((word) => {
    const next = buildBatchInput(word, batch)
    return (
      word.collectionId !== next.collectionId ||
      (word.type ?? '') !== next.type ||
      (word.topic ?? '') !== next.topic ||
      (word.level ?? '') !== next.level
    )
  })
}