// TYPING skill (BR-50…52).
//
// 3 templates per word (key → type):
//   word          → transcription
//   transcription → word
//   meaning       → word
//
// Comparison is normalized (trimmed, lowercased, whitespace-collapsed —
// BR-50 / AMB-13). Unicode diacritic folding is opt-in per item via
// payload.foldDiacritics (default off).

import { createItem } from '@/engine/core/item'
import { SKILL_IDS } from '@/engine/core/constants'
import { normalizeForCompare, foldDiacritics } from '@/lib/text'

export const meta = Object.freeze({
  id: SKILL_IDS.TYPING,
  label: 'Luyện gõ',
  description: 'Gõ câu trả lời tương ứng với từ khóa.',
  icon: 'keyboard',
})

/** Ordered (keyField, targetField) template pairs — BR-50. */
const TEMPLATES = Object.freeze([
  ['word', 'transcription'],
  ['transcription', 'word'],
  ['meaning', 'word'],
])

/**
 * Generate typing items.
 * @param {Object[]} words
 * @param {{rng: () => number, lang?: string}} ctx
 */
export function generate(words) {
  const items = []

  for (const w of words) {
    for (const [keyField, targetField] of TEMPLATES) {
      const prompt = String(w[keyField] ?? '').trim()
      const expected = String(w[targetField] ?? '').trim()
      if (!prompt || !expected) continue

      items.push(
        createItem({
          skillId: meta.id,
          template: `type-${keyField}-${targetField}`,
          sourceWordId: w.id,
          payload: {
            prompt,
            keyField,
            targetField,
            expected,
            // audioText = the WORD field: the most accurate thing to pronounce.
            audioText: String(w.word ?? '').trim(),
            foldDiacritics: false, // opt-in stricter/looser matching flag (BR-50)
          },
        }),
      )
    }
  }

  return items
}

/**
 * Evaluate a typed answer with normalization (BR-50).
 * @param {Object} item
 * @param {{value?: string}} answer
 * @returns {{correct: boolean, expected: string}}
 */
export function evaluate(item, answer) {
  let typed = normalizeForCompare(answer?.value ?? '')
  let expected = normalizeForCompare(item.payload.expected)

  if (item.payload.foldDiacritics) {
    typed = foldDiacritics(typed)
    expected = foldDiacritics(expected)
  }

  return { correct: typed === expected, expected: item.payload.expected }
}

/** Exposed for tests/documentation. */
export const templates = TEMPLATES

export default { meta, generate, evaluate }