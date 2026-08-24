// Engine-wide constants (docs/learning-engine.md §3).
// Stable identifiers — import these everywhere, never scatter literal strings.

export const SKILL_IDS = Object.freeze({
  FLASH_CARD: 'FLASH_CARD',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  LISTENING: 'LISTENING',
  TYPING: 'TYPING',
})

/** Flash-card learner actions (BR-42). */
export const FLASH_CARD_ACTIONS = Object.freeze({
  REMEMBERED: 'remembered', // Đã nhớ → item completed
  RETRY: 'retry', // Học lại → item re-queued (BR-43)
})

/** Number of answer options for choice-based skills (BR-45). */
export const OPTIONS_PER_QUESTION = 4

/** Distractor count = options − correct answer. */
export const DISTRACTOR_COUNT = OPTIONS_PER_QUESTION - 1

/** Skill plan lifecycle (docs/learning-engine.md §5). */
export const SKILL_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
})
