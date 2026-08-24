// Learning service (docs/architecture.md §2/§5, learning-engine.md §8).
// Coordinates selection state → engine session snapshots.
// SKELETON: contract only; engine wiring arrives in Phase 4.

import { useLearningStore } from '@/stores/learningStore'
import { useWordsStore } from '@/stores/wordsStore'
import { MIN_WORDS_TO_STUDY, MIN_SKILLS_TO_START } from '@/stores/learningStore'

/**
 * Start a learning session for the current selection.
 * TODO(Phase 4): call the engine's LearningSession.startSession(...) and
 * store the snapshot in learningStore.learningSession.
 *
 * @returns {Promise<{ok: true}|{ok: false, reason: string}>}
 */
export async function startLearningSession() {
  const learningStore = useLearningStore()
  const wordsStore = useWordsStore()

  const collectionId = learningStore.selectedCollectionId
  if (!collectionId) return { ok: false, reason: 'No collection selected' }
  if (learningStore.selectedWordIds.length < MIN_WORDS_TO_STUDY) {
    return { ok: false, reason: `Select at least ${MIN_WORDS_TO_STUDY} words` }
  }
  if (learningStore.selectedSkillIds.length < MIN_SKILLS_TO_START) {
    return { ok: false, reason: 'Select at least one skill' }
  }

  // Words snapshot from cache (independent copy per docs).
  const words = wordsStore
    .wordsOf(collectionId)
    .filter((w) => learningStore.selectedWordIds.includes(w.id))
    .map((w) => ({ ...w }))

  // TODO(Phase 4):
  //   const snapshot = LearningSession.startSession({
  //     collectionId, wordIds: selectedWordIds, skillIds: selectedSkillIds,
  //     words, seed: Date.now(),
  //   })
  //   learningStore.learningSession = snapshot
  //   learningStore.setActiveSkill(snapshot.selectedSkillOrder[0])

  void words
  return { ok: true }
}

/**
 * Exit the active skill (BR-70): only that skill's progress is discarded.
 * @returns {void}
 */
export function exitSkill() {
  const learningStore = useLearningStore()
  learningStore.exitSkill()
}