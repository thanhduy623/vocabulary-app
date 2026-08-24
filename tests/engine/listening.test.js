import { describe, it, expect } from 'vitest'
import listening from '@/engine/skills/listening'
import { createRng } from '@/engine/core/math'
import { freshWords } from './helpers'

describe('LISTENING generation (BR-48)', () => {
  it('generates 3 targets per fully-populated word, audio always the word (AMB-2)', () => {
    const words = freshWords()
    const items = listening.generate(words, { rng: createRng(70) })

    expect(items.length).toBe(words.length * 3)
    for (const item of items) {
      const source = words.find((w) => w.id === item.sourceWordId)
      expect(item.payload.audioText).toBe(source.word) // TTS speaks the word
      expect(item.payload.options.length).toBe(4)
      expect(item.payload.options).toContain(item.payload.expected)
      expect(['word', 'transcription', 'meaning']).toContain(item.payload.target)
    }
  })

  it('skips blank answer fields (AMB-8)', () => {
    const words = [{ ...freshWords()[0], transcription: '' }]
    const items = listening.generate(words, { rng: createRng(71) })
    const targets = items.map((i) => i.template)

    expect(targets).not.toContain('listen-transcription')
    expect(targets).toContain('listen-word')
    expect(targets).toContain('listen-meaning')
  })
})

describe('LISTENING evaluate (BR-49)', () => {
  const [item] = listening.generate(freshWords().slice(0, 2), {
    rng: createRng(72),
  })

  it('accepts the correct option and rejects wrong ones', () => {
    expect(listening.evaluate(item, { option: item.payload.expected }).correct).toBe(true)

    const wrong = item.payload.options.find((o) => o !== item.payload.expected)
    expect(listening.evaluate(item, { option: wrong }).correct).toBe(false)
  })

  it('supports answering by option index', () => {
    const idx = item.payload.options.indexOf(item.payload.expected)
    expect(listening.evaluate(item, { optionIndex: idx }).correct).toBe(true)
  })
})