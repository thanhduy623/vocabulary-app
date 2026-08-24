import { describe, it, expect } from 'vitest'
import {
  registerSkill,
  getSkill,
  hasSkill,
  listSkillMetas,
} from '@/engine/registry'
import { SKILL_IDS } from '@/engine/core/constants'

describe('skill registry', () => {
  it('registers the four built-in skills', () => {
    const metas = listSkillMetas().map((m) => m.id)
    expect(metas).toContain(SKILL_IDS.FLASH_CARD)
    expect(metas).toContain(SKILL_IDS.MULTIPLE_CHOICE)
    expect(metas).toContain(SKILL_IDS.LISTENING)
    expect(metas).toContain(SKILL_IDS.TYPING)
  })

  it('looks skills up by id and reports unknown ids as null', () => {
    expect(getSkill(SKILL_IDS.FLASH_CARD)).not.toBeNull()
    expect(getSkill('__missing__')).toBeNull()
    expect(hasSkill(SKILL_IDS.TYPING)).toBe(true)
    expect(hasSkill('__missing__')).toBe(false)
  })

  it('validates definitions on registration', () => {
    expect(() => registerSkill({ meta: { id: 'X' } })).toThrow(/generate/)
    expect(() =>
      registerSkill({ meta: { id: 'Y' }, generate: () => [] }),
    ).toThrow(/evaluate/)
    expect(() => registerSkill({ generate: () => [], evaluate: () => ({}) }))
      .toThrow(/meta\.id/)
  })

  it('replaces a skill when re-registered with the same id (replaceability)', () => {
    const original = getSkill(SKILL_IDS.TYPING)

    const custom = {
      meta: { ...original.meta },
      generate: () => [
        { id: 'custom-1', skillId: SKILL_IDS.TYPING, template: 'custom', sourceWordId: 'w1', payload: {}, attempts: 0 },
      ],
      evaluate: () => ({ correct: true, expected: null }),
    }
    registerSkill(custom)

    const replaced = getSkill(SKILL_IDS.TYPING)
    expect(replaced.generate([], { rng: () => 0.5 })).toHaveLength(1)

    // restore the built-in for other tests
    registerSkill(original)
    expect(getSkill(SKILL_IDS.TYPING)).toBe(original)
  })
})