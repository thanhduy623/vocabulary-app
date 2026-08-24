// Skill registry (docs/learning-engine.md §3, §8).
//
// Generic skill interface — a skill is exactly:
//
//   {
//     meta:     { id, label, description, icon },   // stable id (SKILL_IDS)
//     generate: (words, { rng, lang }) => Item[],   // pure
//     evaluate: (item, answer) => { correct, expected }, // pure
//   }
//
// Adding a 5th skill = write one module + register it here. The session core
// (queue/progress/completion) never changes.

import flashCard from './skills/flashCard'
import multipleChoice from './skills/multipleChoice'
import listening from './skills/listening'
import typing from './skills/typing'

/** @type {Map<string, {meta: Object, generate: Function, evaluate: Function}>} */
const definitions = new Map()

/**
 * Register a skill definition. Re-registering the same id replaces the
 * previous implementation — this is what makes each skill independently
 * replaceable.
 * @param {{meta: {id: string}, generate: Function, evaluate: Function}} definition
 */
export function registerSkill(definition) {
  if (!definition?.meta?.id) {
    throw new Error('registerSkill: definition.meta.id is required')
  }
  if (typeof definition.generate !== 'function') {
    throw new Error(`registerSkill(${definition.meta.id}): generate() is required`)
  }
  if (typeof definition.evaluate !== 'function') {
    throw new Error(`registerSkill(${definition.meta.id}): evaluate() is required`)
  }
  definitions.set(definition.meta.id, definition)
}

/** @param {string} id @returns {Object|null} */
export function getSkill(id) {
  return definitions.get(id) ?? null
}

/** @param {string} id */
export function hasSkill(id) {
  return definitions.has(id)
}

/** @returns {Object[]} metas in registration order (drives the skill picker UI). */
export function listSkillMetas() {
  return [...definitions.values()].map((d) => d.meta)
}

// ---- built-in skills -------------------------------------------------------

registerSkill(flashCard)
registerSkill(multipleChoice)
registerSkill(listening)
registerSkill(typing)