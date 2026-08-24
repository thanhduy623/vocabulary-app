// LearningSession core (docs/learning-engine.md §5–§7).
//
// Pure domain logic — no Vue, no Firebase, no Pinia. All functions operate on
// a plain session object and are deterministic given (input + seed) for
// generation; retry re-insertion uses runtime randomness by design.
//
// State separation (per requirement):
//   session            → the whole snapshot (id/collection/words/skills)
//   selected skills    → session.selectedSkillOrder (fixed at creation)
//   active skill       → caller-tracked via beginSkill()/activateNextPendingSkill()
//   completed skills   → derived: skills[id].status === 'completed'
//   current item       → skills[id].queue[0] while status === 'active'
//   retry items        → items still inside the queue after a wrong answer
//   progress           → getProgress(session, skillId)

import { uuid } from '@/lib/uuid'
import { createRng, resolveSeed, shuffle, randomInt } from './math'
import { SKILL_STATUS } from './constants'
import { getSkill } from '../registry'

/**
 * Create a learning session snapshot.
 *
 * Generates all items for every selected skill up-front (eager snapshot),
 * shuffles each queue, and initializes progress counters. Nothing is marked
 * active until beginSkill() is called.
 *
 * @param {{
 *   collectionId?: string,
 *   words: Object[],          // snapshot of the selected words (copies!)
 *   skillIds: string[],       // selected skills, in learner-chosen order
 *   lang?: string,            // collection.symbol for TTS playback
 *   seed?: number|null,       // reproducible generation for tests/replay
 * }} params
 * @returns {Object} session
 */
export function createLearningSession({
  collectionId = '',
  words = [],
  skillIds = [],
  lang = '',
  seed = null,
} = {}) {
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error('createLearningSession: words must be a non-empty array')
  }
  if (!Array.isArray(skillIds) || skillIds.length === 0) {
    throw new Error('createLearningSession: at least one skill is required')
  }
  const unknown = skillIds.filter((id) => !getSkill(id))
  if (unknown.length > 0) {
    throw new Error(`createLearningSession: unknown skills: ${unknown.join(', ')}`)
  }

  const usedSeed = resolveSeed(seed)
  const rng = createRng(usedSeed)

  /** @type {Record<string, Object>} */
  const skills = {}
  for (const id of skillIds) {
    const skill = getSkill(id)
    const items = shuffle(skill.generate(words, { rng, lang }), rng)
    skills[id] = {
      meta: { ...skill.meta },
      total: items.length,
      completed: 0,
      correct: 0,
      incorrect: 0,
      status: SKILL_STATUS.PENDING,
      activeItemId: null,
      queue: items, // items awaiting mastery (active item stays at index 0)
    }
  }

  return {
    id: uuid(),
    collectionId,
    lang,
    startedAt: new Date().toISOString(),
    seed: usedSeed,
    // Word snapshot kept on the session so a skill plan can be regenerated
    // fresh (resetSkill) — mastered items are removed from the queue, so the
    // original words are required to rebuild it.
    words: [...words],
    selectedSkillOrder: [...skillIds],
    skills,
  }
}

/**
 * Forget a skill's process: regenerate its plan from scratch (fresh shuffle,
 * zeroed counters, status back to pending). Used when the learner backs out
 * of a skill or wants to re-study an already completed one.
 *
 * @param {Object} session
 * @param {string} skillId
 * @returns {Object} the reset plan
 */
export function resetSkill(session, skillId) {
  const plan = requirePlan(session, skillId)
  const skill = getSkill(skillId)
  const rng = createRng(resolveSeed(null)) // fresh randomness per reset

  const items = shuffle(
    skill.generate(session.words ?? [], { rng, lang: session.lang }),
    rng,
  )

  plan.total = items.length
  plan.completed = 0
  plan.correct = 0
  plan.incorrect = 0
  plan.status = SKILL_STATUS.PENDING
  plan.activeItemId = null
  plan.queue = items
  return plan
}

/**
 * Begin a pending skill: marks it active and points its head at the first
 * queued item. Idempotent for already-active/completed skills.
 * @param {Object} session
 * @param {string} skillId
 * @returns {Object} the skill plan
 */
export function beginSkill(session, skillId) {
  const plan = requirePlan(session, skillId)
  if (plan.status !== SKILL_STATUS.PENDING) return plan

  plan.status = SKILL_STATUS.ACTIVE
  pointHeadAtNext(plan)
  return plan
}

/** First selected-but-pending skill in order; null when none remain. */
export function findPendingSkill(session) {
  return (
    session.selectedSkillOrder.find(
      (id) => session.skills[id].status === SKILL_STATUS.PENDING,
    ) ?? null
  )
}

/**
 * Convenience: activate the next pending skill (if any).
 * @returns {string|null} the activated skill id
 */
export function activateNextPendingSkill(session) {
  const id = findPendingSkill(session)
  if (id) beginSkill(session, id)
  return id
}

/** Current item of an active skill, or null when its queue is exhausted. */
export function getCurrentItem(session, skillId) {
  const plan = requirePlan(session, skillId)
  if (plan.status !== SKILL_STATUS.ACTIVE || !plan.activeItemId) return null
  return plan.queue.find((item) => item.id === plan.activeItemId) ?? null
}

/**
 * Browse to the next card WITHOUT resolving the current one (flash-card
 * "Tiếp theo"). The head rotates to the tail so it stays pending and comes
 * back around — counters/completion are untouched.
 *
 * @returns {Object|null} the new current item
 */
export function skipToNextItem(session, skillId) {
  const plan = requirePlan(session, skillId)
  assertActive(plan, skillId)

  if (plan.queue.length <= 1) return getCurrentItem(session, skillId)
  const leaving = plan.queue.shift()
  plan.queue.push(leaving)
  // Current becomes the NEW head (the previously second card).
  plan.activeItemId = plan.queue[0].id
  return plan.queue[0]
}

/**
 * Browse back to the previously browsed card ("Lùi lại" — cyclic): the tail
 * rotates to the head. Counters/completion are untouched.
 *
 * @returns {Object|null} the new current item
 */
export function backToPreviousItem(session, skillId) {
  const plan = requirePlan(session, skillId)
  assertActive(plan, skillId)

  if (plan.queue.length <= 1) return getCurrentItem(session, skillId)
  const item = plan.queue.pop()
  plan.queue.unshift(item)
  plan.activeItemId = item.id
  return item
}

/**
 * Submit an answer for the CURRENT item of an ACTIVE skill.
 *
 * Correct  → item leaves the queue forever (completed++).
 * Wrong    → item is re-inserted at a random later position in the queue
 *            (retry semantics, BR-46/49/51/12).
 *
 * Flash cards reuse this pipeline: evaluate() maps 'remembered'→correct and
 * 'retry'→incorrect, so Đã nhớ/Học lại need no special-casing here.
 *
 * @param {Object} session
 * @param {string} skillId
 * @param {Object} answer  shape depends on the skill's evaluate()
 * @returns {{itemId: string, template: string, correct: boolean, expected: *,
 *          attempts: number, reQueued: boolean, skillCompleted: boolean}}
 */
export function submitAnswer(session, skillId, answer) {
  const plan = requirePlan(session, skillId)
  assertActive(plan, skillId)

  const item = getCurrentItem(session, skillId)
  if (!item) {
    throw new Error(`submitAnswer(${skillId}): no current item`)
  }

  const result = getSkill(skillId).evaluate(item, answer)
  item.attempts += 1

  let reQueued = false
  if (result.correct) {
    // Mastered: drop from the queue entirely.
    plan.queue.shift()
    plan.correct += 1
    plan.completed += 1
  } else {
    // Retry queue: keep the item, re-insert it at a random LATER position so
    // it cannot repeat immediately but must come back before finishing.
    plan.queue.shift()
    if (plan.queue.length === 0) {
      plan.queue.push(item)
    } else {
      const position = randomInt(Math.random, 1, plan.queue.length)
      plan.queue.splice(position, 0, item)
    }
    plan.incorrect += 1
    reQueued = true
  }

  advance(plan)

  return {
    itemId: item.id,
    template: item.template,
    correct: Boolean(result.correct),
    expected: result.expected ?? null,
    attempts: item.attempts,
    reQueued,
    skillCompleted: plan.status === SKILL_STATUS.COMPLETED,
  }
}

/**
 * Progress snapshot (BR-60…61).
 * @returns {{total:number, completed:number, remaining:number,
 *           correct:number, incorrect:number, status:string}}
 */
export function getProgress(session, skillId) {
  const plan = requirePlan(session, skillId)
  return {
    total: plan.total,
    completed: plan.completed,
    remaining: plan.queue.length,
    correct: plan.correct,
    incorrect: plan.incorrect,
    status: plan.status,
  }
}

/** BR-63: queue exhausted ⇒ skill completed. */
export function isSkillComplete(session, skillId) {
  return requirePlan(session, skillId).status === SKILL_STATUS.COMPLETED
}

/** BR-64: every selected skill completed ⇒ session complete. */
export function isSessionComplete(session) {
  return session.selectedSkillOrder.every(
    (id) => session.skills[id].status === SKILL_STATUS.COMPLETED,
  )
}

// ---- internals -------------------------------------------------------------

function requirePlan(session, skillId) {
  const plan = session.skills[skillId]
  if (!plan) {
    throw new Error(`Unknown skill "${skillId}" in session ${session.id}`)
  }
  return plan
}

function assertActive(plan, skillId) {
  if (plan.status !== SKILL_STATUS.ACTIVE) {
    throw new Error(`submitAnswer(${skillId}): skill is not active (${plan.status})`)
  }
}

/** Point the head at the first queued item, or complete the skill when empty. */
function pointHeadAtNext(plan) {
  if (plan.queue.length === 0) {
    plan.activeItemId = null
    plan.status = SKILL_STATUS.COMPLETED
    return
  }
  plan.activeItemId = plan.queue[0].id
}

/** After each answer: advance to the next queued item or complete the skill. */
function advance(plan) {
  pointHeadAtNext(plan)
}