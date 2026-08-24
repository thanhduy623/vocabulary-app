import { describe, it, expect } from 'vitest'
import {
  createLearningSession,
  beginSkill,
  findPendingSkill,
  activateNextPendingSkill,
  getCurrentItem,
  submitAnswer,
  skipToNextItem,
  backToPreviousItem,
  getProgress,
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

describe('queue browsing (flash-card Tiếp theo / Lùi lại)', () => {
  function setup() {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [FLASH_CARD],
      seed: 20,
    })
    beginSkill(session, FLASH_CARD)
    return session
  }

  it('skipToNextItem rotates the head to the tail without touching counters', () => {
    const session = setup()
    const plan = session.skills[FLASH_CARD]
    const firstId = getCurrentItem(session, FLASH_CARD).id
    const before = getProgress(session, FLASH_CARD)

    const next = skipToNextItem(session, FLASH_CARD)

    expect(next.id).not.toBe(firstId) // moved on…
    expect(getCurrentItem(session, FLASH_CARD).id).toBe(next.id)
    // …but nothing resolved: the first card is still queued at the tail.
    expect(plan.queue.some((i) => i.id === firstId)).toBe(true)

    const after = getProgress(session, FLASH_CARD)
    expect(after.completed).toBe(before.completed)
    expect(after.correct).toBe(before.correct)
    expect(after.incorrect).toBe(before.incorrect)
    expect(after.remaining).toBe(before.remaining)
  })

  it('backToPreviousItem rotates the tail back to the head', () => {
    const session = setup()
    skipToNextItem(session, FLASH_CARD) // A → B (A at tail)
    const currentBeforeBack = getCurrentItem(session, FLASH_CARD).id

    const prev = backToPreviousItem(session, FLASH_CARD)
    const nowCurrent = getCurrentItem(session, FLASH_CARD).id

    expect(prev.id).toBe(nowCurrent)
    expect(nowCurrent).not.toBe(currentBeforeBack)
    // full membership preserved
    expect(session.skills[FLASH_CARD].queue.length).toBe(
      session.skills[FLASH_CARD].total,
    )
  })

  it('is a no-op when only one item remains', () => {
    const session = createLearningSession({
      words: freshWords().slice(0, 1),
      skillIds: [FLASH_CARD],
      seed: 21,
    })
    // one word with all fields present → exactly 3 cards, drain two of them
    beginSkill(session, FLASH_CARD)
    submitAnswer(session, FLASH_CARD, { value: 'remembered' })
    submitAnswer(session, FLASH_CARD, { value: 'remembered' })

    const only = getCurrentItem(session, FLASH_CARD)
    const next = skipToNextItem(session, FLASH_CARD)
    const prev = backToPreviousItem(session, FLASH_CARD)

    expect(next.id).toBe(only.id)
    expect(prev.id).toBe(only.id)
    expect(getProgress(session, FLASH_CARD).remaining).toBe(1)
  })
})