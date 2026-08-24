// LearningItem envelope (docs/learning-engine.md §2).
//
// Items are plain serializable data so a session snapshot can be inspected
// and replayed. The engine core only relies on the generic fields below;
// everything skill-specific lives in `payload`.

import { uuid } from '@/lib/uuid'

/**
 * @typedef {Object} LearningItem
 * @property {string} id            UUID, stable across re-queues
 * @property {string} skillId       owning skill (FLASH_CARD, …)
 * @property {string} template      skill-specific discriminator, e.g. 'mcq-word-meaning'
 * @property {string} sourceWordId  word the item was generated from
 * @property {Object} payload       skill-specific data (prompt/options/expected/…)
 * @property {number} attempts      how many times the learner faced this item
 */

/**
 * Create a learning item.
 * @param {{skillId: string, template: string, sourceWordId: string, payload: Object}} def
 * @returns {LearningItem}
 */
export function createItem({ skillId, template, sourceWordId, payload }) {
  return {
    id: uuid(),
    skillId,
    template,
    sourceWordId,
    payload,
    attempts: 0,
  }
}