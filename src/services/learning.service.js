// Learning service (docs/architecture.md §2/§5, learning-engine.md §8).
//
// Pure orchestrator between the engine and the learning store: builds the
// session snapshot. It does NOT import any Pinia store — the store applies
// the results to its state (same pattern as collections.service).

import { createLearningSession, activateNextPendingSkill } from '@/engine'

/**
 * Create a learning session snapshot from the learner's selection and
 * activate the first selected skill.
 *
 * @param {{
 *   collectionId: string,
 *   words: Object[],       // snapshot copies of the selected words
 *   skillIds: string[],    // learner-chosen order (BR-33)
 *   lang?: string,         // collection.symbol → TTS pronunciation
 * }} params
 * @returns {{ session: Object, firstSkillId: string|null }}
 * @throws when words/skillIds are invalid or a skill id is unknown
 */
export function createSession({ collectionId, words, skillIds, lang = '' }) {
  const session = createLearningSession({
    collectionId,
    words,
    skillIds,
    lang,
  })
  const firstSkillId = activateNextPendingSkill(session)
  return { session, firstSkillId }
}