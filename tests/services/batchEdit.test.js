// Unit tests for the batch-edit merge logic (src/services/batchEdit.service.js).
// Node-only: buildBatchInput / hasBatchChanges are pure and framework-free.

import { describe, it, expect } from 'vitest'
import { buildBatchInput, hasBatchChanges } from '@/services/batchEdit.service'

/** A cached word with all fields. */
const WORD = {
  id: 'w1',
  collectionId: 'c1',
  word: 'abandon',
  transcription: '/əˈbændən/',
  meaning: 'bỏ rơi',
  example: 'He abandoned his car.',
  type: 'verb',
  topic: 'Daily',
  level: 'B1',
}

describe('buildBatchInput', () => {
  it('never changes word / transcription / meaning / example (requirement)', () => {
    const input = buildBatchInput(WORD, {
      collectionId: 'c2',
      type: 'noun',
      topic: 'Travel',
      level: 'B2',
    })
    expect(input.word).toBe('abandon')
    expect(input.transcription).toBe('/əˈbændən/')
    expect(input.meaning).toBe('bỏ rơi')
    expect(input.example).toBe('He abandoned his car.')
  })

  it('applies the collection from the batch', () => {
    const input = buildBatchInput(WORD, { collectionId: 'c2' })
    expect(input.collectionId).toBe('c2')
  })

  it('applies non-empty type/topic/level values', () => {
    const input = buildBatchInput(WORD, {
      collectionId: 'c1',
      type: 'noun',
      topic: 'Travel',
      level: 'B2',
    })
    expect(input.type).toBe('noun')
    expect(input.topic).toBe('Travel')
    expect(input.level).toBe('B2')
  })

  it('keeps the current field value when the batch field is blank', () => {
    const input = buildBatchInput(WORD, {
      collectionId: 'c1',
      type: '',
      topic: '   ',
      level: '',
    })
    expect(input.type).toBe('verb')
    expect(input.topic).toBe('Daily')
    expect(input.level).toBe('B1')
  })

  it('trims batch values before applying them', () => {
    const input = buildBatchInput(WORD, {
      collectionId: ' c2 ',
      type: '  noun  ',
    })
    expect(input.collectionId).toBe('c2')
    expect(input.type).toBe('noun')
  })

  it('fills missing word fields with empty strings (updateWord contract)', () => {
    const input = buildBatchInput({}, { collectionId: 'c1' })
    expect(input).toMatchObject({
      collectionId: 'c1',
      word: '',
      transcription: '',
      meaning: '',
      example: '',
      type: '',
      topic: '',
      level: '',
    })
  })
})

describe('hasBatchChanges', () => {
  it('is false when the batch reproduces the current values', () => {
    const batch = {
      collectionId: WORD.collectionId,
      type: WORD.type,
      topic: WORD.topic,
      level: WORD.level,
    }
    expect(hasBatchChanges(batch, [WORD])).toBe(false)
  })

  it('is false for an empty batch', () => {
    expect(hasBatchChanges({ collectionId: WORD.collectionId }, [WORD])).toBe(false)
  })

  it('is true when the collection changes', () => {
    expect(
      hasBatchChanges({ collectionId: 'c2', type: '', topic: '', level: '' }, [WORD]),
    ).toBe(true)
  })

  it('is true when type/topic/level changes', () => {
    expect(hasBatchChanges({ collectionId: 'c1', type: 'noun' }, [WORD])).toBe(true)
    expect(hasBatchChanges({ collectionId: 'c1', topic: 'Travel' }, [WORD])).toBe(true)
    expect(hasBatchChanges({ collectionId: 'c1', level: 'C1' }, [WORD])).toBe(true)
  })

  it('is true when at least one of several words changes', () => {
    const other = { ...WORD, id: 'w2' } // identical
    const changed = hasBatchChanges(
      { collectionId: 'c1', level: 'C2' },
      [WORD, other],
    )
    expect(changed).toBe(true)
  })

  it('is false when none of several words change', () => {
    const other = { ...WORD, id: 'w2' }
    expect(
      hasBatchChanges(
        { collectionId: 'c1', type: 'verb', topic: 'Daily', level: 'B1' },
        [WORD, other],
      ),
    ).toBe(false)
  })
})