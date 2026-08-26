import { describe, it, expect } from 'vitest'
import multipleChoice from '@/engine/skills/multipleChoice'
import { createRng } from '@/engine/core/math'
import { freshWords } from './helpers'

describe('MULTIPLE_CHOICE generation (BR-44/45)', () => {
  it('generates 6 questions per fully-populated word', () => {
    const words = freshWords()
    const items = multipleChoice.generate(words, { rng: createRng(60) })
    // all 4 fixture words have word/transcription/meaning → 6 templates each
    expect(items.length).toBe(words.length * 6)
  })

  it('skips templates whose prompt or answer field is blank (AMB-8)', () => {
    const words = [{ ...freshWords()[0], transcription: '', level: 'A1' }]
    const items = multipleChoice.generate(words, { rng: createRng(61) })

    const templates = items.map((i) => i.template)
    expect(templates).not.toContain('mcq-transcription-word')
    expect(templates).not.toContain('mcq-transcription-meaning')
    expect(templates).toContain('mcq-word-meaning')
    expect(templates).toContain('mcq-meaning-word')
  })

  it('builds exactly 4 unique options containing the expected answer', () => {
    const words = freshWords()
    const items = multipleChoice.generate(words, { rng: createRng(62) })
    for (const item of items) {
      expect(item.payload.options.length).toBe(4)
      expect(new Set(item.payload.options).size).toBe(4)
      expect(item.payload.options).toContain(item.payload.expected)
      const source = words.find((w) => w.id === item.sourceWordId)
      // TTS always pronounces the WORD field (most accurate), not the prompt.
      expect(item.payload.audioText).toBe(source.word)
      expect(item.payload.prompt).toBeTruthy()
    }
  })
})

describe('MULTIPLE_CHOICE evaluate (BR-46)', () => {
  const [item] = multipleChoice.generate(freshWords().slice(0, 2), {
    rng: createRng(63),
  })

  it('accepts the correct option by value', () => {
    const res = multipleChoice.evaluate(item, { option: item.payload.expected })
    expect(res.correct).toBe(true)
    expect(res.expected).toBe(item.payload.expected)
  })

  it('accepts the correct option by index', () => {
    const idx = item.payload.options.indexOf(item.payload.expected)
    const res = multipleChoice.evaluate(item, { optionIndex: idx })
    expect(res.correct).toBe(true)
  })

  it('rejects a wrong option', () => {
    const wrong = item.payload.options.find((o) => o !== item.payload.expected)
    expect(multipleChoice.evaluate(item, { option: wrong }).correct).toBe(false)
  })
})