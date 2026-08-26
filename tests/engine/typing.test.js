import { describe, it, expect } from 'vitest'
import typing from '@/engine/skills/typing'
import { createRng } from '@/engine/core/math'
import { freshWords } from './helpers'

describe('TYPING generation (BR-50)', () => {
  it('generates 3 templates per fully-populated word', () => {
    const words = freshWords()
    const items = typing.generate(words)
    expect(items.length).toBe(words.length * 3)
    for (const item of items) {
      const source = words.find((w) => w.id === item.sourceWordId)
      expect(item.payload.prompt).toBeTruthy()
      expect(item.payload.expected).toBeTruthy()
      // TTS always pronounces the WORD field (most accurate), not the prompt.
      expect(item.payload.audioText).toBe(source.word)
    }
  })

  it('skips templates whose key or target is blank (AMB-8)', () => {
    const words = [{ ...freshWords()[0], transcription: '' }]
    const templates = typing
      .generate(words, { rng: createRng(80) })
      .map((i) => i.template)

    // transcription is the TARGET of template 1 and the PROMPT of template 2,
    // so both disappear; meaning→word is unaffected.
    expect(templates).not.toContain('type-word-transcription')
    expect(templates).not.toContain('type-transcription-word')
    expect(templates).toEqual(['type-meaning-word'])
  })
})

describe('TYPING evaluate (BR-50/AMB-13)', () => {
  const [item] = typing.generate(freshWords().slice(0, 1), {
    rng: createRng(81),
  })

  it('accepts the exact expected answer', () => {
    const res = typing.evaluate(item, { value: item.payload.expected })
    expect(res.correct).toBe(true)
  })

  it('is case-insensitive and trims/collapses whitespace', () => {
    const padded = `  ${item.payload.expected.toUpperCase()}  `
    expect(typing.evaluate(item, { value: padded }).correct).toBe(true)
  })

  it('rejects wrong answers', () => {
    const res = typing.evaluate(item, { value: '__totally_wrong__' })
    expect(res.correct).toBe(false)
    expect(res.expected).toBe(item.payload.expected)
  })

  it('respects the optional diacritic-fold flag', () => {
    const foldItem = {
      ...item,
      payload: { ...item.payload, expected: 'con chó', foldDiacritics: true },
    }
    // same letters without diacritics → accepted when folding is on
    expect(typing.evaluate(foldItem, { value: 'con cho' }).correct).toBe(true)

    const strictItem = {
      ...foldItem,
      payload: { ...foldItem.payload, foldDiacritics: false },
    }
    expect(typing.evaluate(strictItem, { value: 'con cho' }).correct).toBe(false)
  })
})