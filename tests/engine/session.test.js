import { describe, it, expect } from 'vitest'
import {
  createLearningSession,
  beginSkill,
  findPendingSkill,
  activateNextPendingSkill,
  getCurrentItem,
  submitAnswer,
} from '@/engine'
import { SKILL_IDS } from '@/engine/core/constants'
import { freshWords } from './helpers'

const { FLASH_CARD, MULTIPLE_CHOICE, TYPING } = SKILL_IDS

describe('createLearningSession', () => {
  it('throws on empty words', () => {
    expect(() =>
      createLearningSession({ words: [], skillIds: [FLASH_CARD] }),
    ).toThrow(/words must be a non-empty array/)
  })

  it('throws when no skill is selected (BR-33)', () => {
    expect(() =>
      createLearningSession({ words: freshWords(), skillIds: [] }),
    ).toThrow(/at least one skill/)
  })

  it('throws on unknown skill ids', () => {
    expect(() =>
      createLearningSession({ words: freshWords(), skillIds: ['NOPE'] }),
    ).toThrow(/unknown skills/i)
  })

  it('creates a pending plan per selected skill with full queues', () => {
    const session = createLearningSession({
      collectionId: 'c1',
      words: freshWords(),
      skillIds: [FLASH_CARD, TYPING],
      seed: 123,
    })

    expect(session.collectionId).toBe('c1')
    expect(session.selectedSkillOrder).toEqual([FLASH_CARD, TYPING])
    expect(Object.keys(session.skills).sort()).toEqual([FLASH_CARD, TYPING].sort())

    for (const id of [FLASH_CARD, TYPING]) {
      const plan = session.skills[id]
      expect(plan.status).toBe('pending')
      expect(plan.completed).toBe(0)
      expect(plan.correct).toBe(0)
      expect(plan.incorrect).toBe(0)
      expect(plan.queue.length).toBe(plan.total)
      plan.queue.forEach((item) => expect(item.skillId).toBe(id))
    }
  })

  it('is reproducible with the same seed (template sequence)', () => {
    const make = () => {
      const s = createLearningSession({
        words: freshWords(),
        skillIds: [MULTIPLE_CHOICE],
        seed: 777,
      })
      return s.skills[MULTIPLE_CHOICE].queue.map(
        (i) => `${i.sourceWordId}:${i.template}`,
      )
    }
    expect(make()).toEqual(make())
  })
})

describe('skill lifecycle', () => {
  it('has no current item before beginSkill and rejects answering', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [TYPING],
      seed: 1,
    })
    expect(getCurrentItem(session, TYPING)).toBeNull()
    expect(() => submitAnswer(session, TYPING, { value: 'x' })).toThrow(
      /not active/,
    )
  })

  it('beginSkill activates the head of the queue', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [TYPING],
      seed: 2,
    })
    beginSkill(session, TYPING)
    const item = getCurrentItem(session, TYPING)
    expect(item).not.toBeNull()
    expect(item.id).toBe(session.skills[TYPING].activeItemId)
  })

  it('finds pending skills in selection order', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [FLASH_CARD, TYPING],
      seed: 3,
    })
    expect(findPendingSkill(session)).toBe(FLASH_CARD)

    beginSkill(session, FLASH_CARD)
    expect(findPendingSkill(session)).toBe(TYPING)

    activateNextPendingSkill(session)
    expect(findPendingSkill(session)).toBeNull()
  })
})