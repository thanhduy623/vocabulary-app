import { describe, it, expect } from 'vitest'
import {
  createLearningSession,
  beginSkill,
  getCurrentItem,
  submitAnswer,
  getProgress,
  isSkillComplete,
  isSessionComplete,
} from '@/engine'
import { SKILL_IDS } from '@/engine/core/constants'
import { freshWords, drainSkill } from './helpers'

const { FLASH_CARD, MULTIPLE_CHOICE, TYPING } = SKILL_IDS

describe('retry queue & progress (BR-46/49/51, BR-60..62)', () => {
  function wrongAnswerFor(item) {
    if (item.skillId === MULTIPLE_CHOICE) {
      const wrong = item.payload.options.find((o) => o !== item.payload.expected)
      return { option: wrong ?? '' }
    }
    if (item.skillId === TYPING) {
      return { value: `__wrong__${item.payload.expected}__` }
    }
    throw new Error('unsupported skill in test')
  }

  it('re-queues a wrong answer instead of completing it', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [MULTIPLE_CHOICE],
      seed: 10,
    })
    beginSkill(session, MULTIPLE_CHOICE)

    const total = session.skills[MULTIPLE_CHOICE].total
    const currentId = getCurrentItem(session, MULTIPLE_CHOICE).id

    const result = submitAnswer(
      session,
      MULTIPLE_CHOICE,
      wrongAnswerFor(getCurrentItem(session, MULTIPLE_CHOICE)),
    )

    expect(result.correct).toBe(false)
    expect(result.reQueued).toBe(true)
    expect(result.attempts).toBe(1)

    const progress = getProgress(session, MULTIPLE_CHOICE)
    expect(progress.incorrect).toBe(1)
    expect(progress.remaining).toBe(total) // nothing lost — still must come back
    expect(progress.completed).toBe(0)

    // the wrong item is still somewhere in the queue
    expect(
      session.skills[MULTIPLE_CHOICE].queue.some((i) => i.id === currentId),
    ).toBe(true)
  })

  it('completes after mastering everything in a correct-only run', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [MULTIPLE_CHOICE],
      seed: 11,
    })

    drainSkill(
      session,
      MULTIPLE_CHOICE,
      (item) => ({ option: item.payload.expected }),
      { beginSkill, getCurrentItem, submitAnswer, isSkillComplete },
    )

    const p = getProgress(session, MULTIPLE_CHOICE)
    expect(p.status).toBe('completed')
    expect(p.completed).toBe(p.total)
    expect(p.remaining).toBe(0)
    expect(p.incorrect).toBe(0)
    expect(isSkillComplete(session, MULTIPLE_CHOICE)).toBe(true)
  })

  it('does NOT skip an item after a wrong answer — it fully re-appears', () => {
    // The mastery-debt model: a missed item must be answered correctly enough
    // times (its error count + 1) before it is mastered and removed. One
    // correct after many wrongs is NOT enough — it must keep coming back.
    const session = createLearningSession({
      words: freshWords().slice(0, 1),
      skillIds: [MULTIPLE_CHOICE],
      seed: 21,
    })
    beginSkill(session, MULTIPLE_CHOICE)

    // Deterministic: collapse the skill to ONE specific item so every answer
    // below targets the exact same question (avoids queue-shuffle ambiguity).
    const plan = session.skills[MULTIPLE_CHOICE]
    const target = getCurrentItem(session, MULTIPLE_CHOICE)
    plan.queue = [target]
    plan.activeItemId = target.id

    const wrongAns = (item) => ({
      option: item.payload.options.find((o) => o !== item.payload.expected) ?? '',
    })
    const rightAns = (item) => ({ option: item.payload.expected })

    // 3 mistakes on the SAME item, then ONE correct answer…
    submitAnswer(session, MULTIPLE_CHOICE, wrongAns(target))
    submitAnswer(session, MULTIPLE_CHOICE, wrongAns(target))
    submitAnswer(session, MULTIPLE_CHOICE, wrongAns(target))
    const afterOneCorrect = submitAnswer(session, MULTIPLE_CHOICE, rightAns(target))

    // …that single correct must NOT master it: debt = 1 + 3 wrongs = 4,
    // one correct → 3 → still re-queued, NOT completed, so never skipped.
    expect(afterOneCorrect.correct).toBe(true)
    expect(afterOneCorrect.reQueued).toBe(true)
    expect(getProgress(session, MULTIPLE_CHOICE).completed).toBe(0)
    expect(getProgress(session, MULTIPLE_CHOICE).remaining).toBe(1)
    expect(
      session.skills[MULTIPLE_CHOICE].queue.some((i) => i.id === target.id),
    ).toBe(true)

    // The skill only ends once the debt is fully drained by correct reps.
    drainSkill(
      session,
      MULTIPLE_CHOICE,
      (item) => ({ option: item.payload.expected }),
      { beginSkill, getCurrentItem, submitAnswer, isSkillComplete },
    )
    const done = getProgress(session, MULTIPLE_CHOICE)
    expect(done.status).toBe('completed')
    expect(done.completed).toBe(1) // the one real item fully mastered
    expect(done.remaining).toBe(0)
  })

  it('completes a skill that had retries — queue fully drained', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [TYPING],
      seed: 12,
    })
    beginSkill(session, TYPING)

    let guard = 0
    while (!isSkillComplete(session, TYPING)) {
      const item = getCurrentItem(session, TYPING)
      // first attempt at word→transcription cards is wrong; retries are right
      const wrong =
        item.template === 'type-word-transcription' && item.attempts === 0
      submitAnswer(session, TYPING, {
        value: wrong ? '__nope__' : ` ${item.payload.expected.toUpperCase()} `,
      })
      guard += 1
      expect(guard).toBeLessThan(2000)
    }

    const p = getProgress(session, TYPING)
    expect(p.remaining).toBe(0)
    expect(p.incorrect).toBeGreaterThan(0)
    expect(p.correct).toBeGreaterThan(0)
  })
})

describe('multi-skill sessions & completion (BR-63/64)', () => {
  it('session completes only when EVERY selected skill completes', () => {
    const session = createLearningSession({
      words: freshWords(),
      skillIds: [FLASH_CARD, TYPING],
      seed: 13,
    })
    expect(isSessionComplete(session)).toBe(false)

    drainSkill(session, FLASH_CARD, () => ({ value: 'remembered' }), {
      beginSkill,
      getCurrentItem,
      submitAnswer,
      isSkillComplete,
    })
    expect(isSkillComplete(session, FLASH_CARD)).toBe(true)
    expect(isSessionComplete(session)).toBe(false) // typing still pending

    drainSkill(session, TYPING, (item) => ({ value: item.payload.expected }), {
      beginSkill,
      getCurrentItem,
      submitAnswer,
      isSkillComplete,
    })
    expect(isSessionComplete(session)).toBe(true)
  })
})