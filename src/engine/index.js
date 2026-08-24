// Public entry point of the learning engine (docs/learning-engine.md).
//
// Consumers (stores/services/composables) should import from '@/engine' only —
// never from deep internals — so the internal layout stays replaceable.
//
// The engine is 100% framework-free: no Vue, no Pinia, no Firebase.

// Session lifecycle & queries
export {
  createLearningSession,
  beginSkill,
  findPendingSkill,
  activateNextPendingSkill,
  resetSkill,
  getCurrentItem,
  skipToNextItem,
  backToPreviousItem,
  submitAnswer,
  getProgress,
  isSkillComplete,
  isSessionComplete,
} from './core/session'

// Randomization utilities
export { createRng, resolveSeed, shuffle, randomInt, pickDistractors, buildOptions } from './core/math'

// Item factory
export { createItem } from './core/item'

// Constants
export {
  SKILL_IDS,
  FLASH_CARD_ACTIONS,
  OPTIONS_PER_QUESTION,
  DISTRACTOR_COUNT,
  SKILL_STATUS,
} from './core/constants'

// Skill registry (generic interface + built-ins)
export {
  registerSkill,
  getSkill,
  hasSkill,
  listSkillMetas,
} from './registry'