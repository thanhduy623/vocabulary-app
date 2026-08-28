// MULTIPLE_CHOICE skill (BR-44…47).
//
// 6 question templates per word (Q → A):
//   word→transcription, word→meaning,
//   transcription→word, transcription→meaning,
//   meaning→word,       meaning→transcription
//
// Each question shows exactly OPTIONS_PER_QUESTION options when the word pool
// allows; distractors come from the same field of OTHER selected words
// (deduplicated — BR-45). Blank prompts/answers are skipped (AMB-8).

import { createItem } from '@/engine/core/item'
import { buildOptions } from '@/engine/core/math'
import { DISTRACTOR_COUNT, SKILL_IDS } from '@/engine/core/constants'

export const meta = Object.freeze({
  id: SKILL_IDS.MULTIPLE_CHOICE,
  label: 'Chọn từ',
  description: 'Đọc câu hỏi và chọn đáp án đúng.',
  icon: 'list-check',
  /** Learner-selectable Q → A direction pairs; each id IS the template. */
  options: Object.freeze([
    { id: 'mcq-word-transcription', label: 'Từ → Phiên âm' },
    { id: 'mcq-word-meaning', label: 'Từ → Nghĩa' },
    { id: 'mcq-transcription-word', label: 'Phiên âm → Từ' },
    { id: 'mcq-transcription-meaning', label: 'Phiên âm → Nghĩa' },
    { id: 'mcq-meaning-word', label: 'Nghĩa → Từ' },
    { id: 'mcq-meaning-transcription', label: 'Nghĩa → Phiên âm' },
  ]),
})

/** Ordered (promptField, answerField) template pairs — BR-44. */
const TEMPLATES = Object.freeze([
  ['word', 'transcription'],
  ['word', 'meaning'],
  ['transcription', 'word'],
  ['transcription', 'meaning'],
  ['meaning', 'word'],
  ['meaning', 'transcription'],
])

/**
 * Generate multiple-choice items.
 * @param {Object[]} words
 * @param {{rng: () => number, lang?: string, options?: string[]}} ctx
 *   ctx.options = selected option ids (templates). Empty/omitted → all pairs.
 */
export function generate(words, ctx = {}) {
  const items = []
  const rng = ctx?.rng ?? Math.random
  const allowed =
    Array.isArray(ctx?.options) && ctx.options.length > 0
      ? new Set(ctx.options)
      : null

  for (const w of words) {
    for (const [promptField, answerField] of TEMPLATES) {
      const template = `mcq-${promptField}-${answerField}`
      if (allowed && !allowed.has(template)) continue

      const prompt = String(w[promptField] ?? '').trim()
      const expected = String(w[answerField] ?? '').trim()
      if (!prompt || !expected) continue // skip blank-prompt templates

      const pool = words
        .filter((other) => other.id !== w.id)
        .map((other) => String(other[answerField] ?? ''))

      items.push(
        createItem({
          skillId: meta.id,
          template,
          sourceWordId: w.id,
          payload: {
            prompt,
            promptField,
            answerField,
            expected,
            // audioText = the WORD field: the most accurate thing to pronounce.
            audioText: String(w.word ?? '').trim(),
            options: buildOptions({ expected, pool, rng }),
          },
        }),
      )
    }
  }

  return items
}

/**
 * Evaluate a chosen option.
 * @param {Object} item
 * @param {{option?: string, optionIndex?: number}} answer
 * @returns {{correct: boolean, expected: string}}
 */
export function evaluate(item, answer) {
  let chosen = answer?.option
  if (
    (chosen === undefined || chosen === null) &&
    Number.isInteger(answer?.optionIndex)
  ) {
    chosen = item.payload.options[answer.optionIndex]
  }
  return {
    correct: chosen === item.payload.expected,
    expected: item.payload.expected,
  }
}

/** Exposed for tests/documentation. */
export const templates = TEMPLATES
export const distractorCount = DISTRACTOR_COUNT

export default { meta, generate, evaluate }