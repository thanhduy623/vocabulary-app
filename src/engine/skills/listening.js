// LISTENING skill (BR-48…49).
//
// 3 question targets per word: the TTS always speaks the word's text
// (AMB-2) and the learner picks the matching word / transcription / meaning.
// Same option mechanics as MULTIPLE_CHOICE (BR-49). Blank answer fields are
// skipped (AMB-8). Playback (auto-play, replay, lang handling) is a UI
// concern via services/audio.service.js — the engine only carries audioText.

import { createItem } from '@/engine/core/item'
import { buildOptions } from '@/engine/core/math'
import { SKILL_IDS } from '@/engine/core/constants'

export const meta = Object.freeze({
  id: SKILL_IDS.LISTENING,
  label: 'Luyện nghe',
  description: 'Nghe phát âm và chọn đáp án đúng.',
  icon: 'headphones',
  /** Answer-target options; the audio (the word) is always the key. */
  options: Object.freeze([
    { id: 'listen-word', label: 'Nghe → Chọn TỪ' },
    { id: 'listen-transcription', label: 'Nghe → Chọn PHIÊN ÂM' },
    { id: 'listen-meaning', label: 'Nghe → Chọn NGHĨA' },
  ]),
})

/** Answer target fields — BR-48. */
const TARGETS = Object.freeze(['word', 'transcription', 'meaning'])

/**
 * Generate listening items.
 * @param {Object[]} words
 * @param {{rng: () => number, lang?: string, options?: string[]}} ctx
 *   ctx.options = selected option ids (templates). Empty/omitted → all targets.
 */
export function generate(words, ctx = {}) {
  const items = []
  const rng = ctx?.rng ?? Math.random
  const allowed =
    Array.isArray(ctx?.options) && ctx.options.length > 0
      ? new Set(ctx.options)
      : null

  for (const w of words) {
    const audioText = String(w.word ?? '').trim()
    if (!audioText) continue // nothing to pronounce

    for (const target of TARGETS) {
      const template = `listen-${target}`
      if (allowed && !allowed.has(template)) continue

      const expected = String(w[target] ?? '').trim()
      if (!expected) continue

      const pool = words
        .filter((other) => other.id !== w.id)
        .map((other) => String(other[target] ?? ''))

      items.push(
        createItem({
          skillId: meta.id,
          template,
          sourceWordId: w.id,
          payload: {
            audioText,
            target,
            expected,
            options: buildOptions({ expected, pool, rng }),
          },
        }),
      )
    }
  }

  return items
}

/**
 * Evaluate a chosen option (identical mechanics to MCQ — BR-49).
 * @param {Object} item
 * @param {{option?: string, optionIndex?: number}} answer
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

export const targets = TARGETS

export default { meta, generate, evaluate }