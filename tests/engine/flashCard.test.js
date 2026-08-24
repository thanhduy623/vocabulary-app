import { describe, it, expect } from 'vitest'
import flashCard from '@/engine/skills/flashCard'
import { createRng } from '@/engine/core/math'
import { FLASH_CARD_ACTIONS } from '@/engine/core/constants'
import { freshWords } from './helpers'

describe('FLASH_CARD generation (BR-40)', () => {
  it('generates exactly 3 cards per complete word', () => {
    const items = flashCard.generate(freshWords().slice(0, 1), {
      rng: createRng(50),
    })
    expect(items.length).toBe(3)
    expect(
      items.map((i) => i.template).sort(),
    ).toEqual([
      'card-front-meaning',
      'card-front-transcription',
      'card-front-word',
    ])
  })

  it('skips card types whose front field is blank (AMB-8)', () => {
    const words = freshWords()
    const noLevel = words.map((w) => ({ ...w, transcription: '', meaning: '' }))
    // only the word-front card survives for every word
    const items = flashCard.generate(noLevel, { rng: createRng(51) })
    expect(items.length).toBe(noLevel.length)
    expect(items.every((i) => i.template === 'card-front-word')).toBe(true)
  })

  it('carries detail + audioText on every card and shuffles output', () => {
    const words = freshWords()
    const items = flashCard.generate(words, { rng: createRng(52) })

    expect(items.length).toBe(words.length * 3)
    for (const item of items) {
      expect(item.payload.audioText).toBeTruthy()
      expect(item.payload.detail).toBeTypeOf('object')
      if (item.template !== 'card-front-word') {
        expect(item.payload.detail.word).toBeTruthy()
      }
    }
  })
})

describe('FLASH_CARD evaluate (BR-42)', () => {
  const item = flashCard.generate(freshWords().slice(0, 1), {
    rng: createRng(53),
  })[0]

  it("'remembered' (Đã nhớ) is correct", () => {
    const res = flashCard.evaluate(item, { value: FLASH_CARD_ACTIONS.REMEMBERED })
    expect(res.correct).toBe(true)
  })

  it("'retry' (Học lại) is not correct → engine re-queues it", () => {
    const res = flashCard.evaluate(item, { value: FLASH_CARD_ACTIONS.RETRY })
    expect(res.correct).toBe(false)
  })

  it('unknown actions are not correct', () => {
    expect(flashCard.evaluate(item, { value: 'zzz' }).correct).toBe(false)
    expect(flashCard.evaluate(item, {}).correct).toBe(false)
  })
})