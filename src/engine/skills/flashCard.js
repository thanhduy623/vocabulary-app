// FLASH_CARD skill (BR-40…43).
//
// 3 card types per word:
//   FRONT word          → BACK: transcription/meaning/example/type/topic/level + audio
//   FRONT transcription → BACK: … + word
//   FRONT meaning       → BACK: … + word
// Cards with an empty front are skipped (no blank prompts — AMB-8).
//
// Interaction model (uniform with other skills): the learner's "answer" is an
// action — 'remembered' (Đã nhớ) completes the card; 'retry' (Học lại)
// re-queues it randomly later without completing it.

import { createItem } from '@/engine/core/item'
import { shuffle } from '@/engine/core/math'
import { FLASH_CARD_ACTIONS, SKILL_IDS } from '@/engine/core/constants'

export const meta = Object.freeze({
  id: SKILL_IDS.FLASH_CARD,
  label: 'Thẻ nhớ',
  description: 'Lật thẻ để ghi nhớ từ vựng.',
  icon: 'cards',
  /**
   * Learner-selectable options (FR-L04b). Each option id IS the item
   * template it enables; the BACK always carries the full details + audio.
   */
  options: Object.freeze([
    { id: 'card-front-word', label: 'Mặt trước: Từ' },
    { id: 'card-front-transcription', label: 'Mặt trước: Phiên âm' },
    { id: 'card-front-meaning', label: 'Mặt trước: Nghĩa' },
  ]),
})

/**
 * Generate flash-card items for the given words.
 * @param {Object[]} words
 * @param {{rng: () => number, lang?: string, options?: string[]}} ctx
 *   ctx.options = selected option ids (templates). Empty/omitted → all fronts.
 * @returns {Object[]} shuffled item list
 */
export function generate(words, ctx = {}) {
  const items = []
  const rng = ctx?.rng ?? Math.random
  const allowed =
    Array.isArray(ctx?.options) && ctx.options.length > 0
      ? new Set(ctx.options)
      : null

  for (const w of words) {
    const detail = {
      transcription: String(w.transcription ?? ''),
      meaning: String(w.meaning ?? ''),
      example: String(w.example ?? ''),
      type: String(w.type ?? ''),
      topic: String(w.topic ?? ''),
      level: String(w.level ?? ''),
    }
    const audioText = String(w.word ?? '')

    // Card 1 — front = word (option-selectable).
    if (!allowed || allowed.has('card-front-word')) {
      items.push(
        createItem({
          skillId: meta.id,
          template: 'card-front-word',
          sourceWordId: w.id,
          payload: { front: audioText, detail, audioText },
        }),
      )
    }

    if (
      detail.transcription.trim() &&
      (!allowed || allowed.has('card-front-transcription'))
    ) {
      items.push(
        createItem({
          skillId: meta.id,
          template: 'card-front-transcription',
          sourceWordId: w.id,
          payload: {
            front: detail.transcription,
            detail: { ...detail, word: audioText },
            audioText,
          },
        }),
      )
    }

    if (
      detail.meaning.trim() &&
      (!allowed || allowed.has('card-front-meaning'))
    ) {
      items.push(
        createItem({
          skillId: meta.id,
          template: 'card-front-meaning',
          sourceWordId: w.id,
          payload: {
            front: detail.meaning,
            detail: { ...detail, word: audioText },
            audioText,
          },
        }),
      )
    }
  }

  return shuffle(items, rng)
}

/**
 * Evaluate a flash-card action.
 * @param {Object} _item   unused — completion is action-driven (BR-42)
 * @param {{value: string}} answer  'remembered' | 'retry'
 * @returns {{correct: boolean, expected: null}}
 */
export function evaluate(_item, answer) {
  return {
    correct: answer?.value === FLASH_CARD_ACTIONS.REMEMBERED,
    expected: null,
  }
}

export default { meta, generate, evaluate }