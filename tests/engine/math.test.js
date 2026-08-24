import { describe, it, expect } from 'vitest'
import {
  createRng,
  shuffle,
  randomInt,
  pickDistractors,
  buildOptions,
} from '@/engine/core/math'

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i += 1) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('different seeds diverge', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).not.toEqual(seqB)
  })
})

describe('shuffle', () => {
  it('returns the same elements (permutation)', () => {
    const rng = createRng(99)
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const output = shuffle(input, rng)
    expect([...output].sort((x, y) => x - y)).toEqual(input)
  })

  it('does not mutate the input array', () => {
    const rng = createRng(5)
    const input = ['a', 'b', 'c']
    shuffle(input, rng)
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('is deterministic with the same seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], createRng(11)))
      .toEqual(shuffle([1, 2, 3, 4, 5], createRng(11)))
  })
})

describe('randomInt', () => {
  it('stays within [min, max] inclusive', () => {
    const rng = createRng(3)
    for (let i = 0; i < 500; i += 1) {
      const v = randomInt(rng, 1, 6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('pickDistractors', () => {
  it('excludes the expected value and empty strings', () => {
    const pool = ['', 'x', 'y', 'z']
    const picked = pickDistractors(pool, 3, { exclude: ['x'], rng: createRng(4) })
    expect(picked).not.toContain('')
    expect(picked).not.toContain('x')
    expect(picked.length).toBe(2) // only y and z remain
  })

  it('de-duplicates candidate values', () => {
    const pool = ['dup', 'dup', 'other']
    const picked = pickDistractors(pool, 5, { exclude: [], rng: createRng(8) })
    expect(picked.sort()).toEqual(['dup', 'other'])
  })

  it('respects the requested count', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    const picked = pickDistractors(pool, 2, { exclude: [], rng: createRng(15) })
    expect(picked.length).toBe(2)
  })
})

describe('buildOptions', () => {
  it('always includes the expected answer', () => {
    const options = buildOptions({
      expected: 'right',
      pool: ['w1', 'w2', 'w3'],
      rng: createRng(21),
    })
    expect(options).toContain('right')
  })

  it('produces up to 4 unique options (expected + 3 distractors)', () => {
    const options = buildOptions({
      expected: 'right',
      pool: ['d1', 'd2', 'd3', 'd4'],
      rng: createRng(30),
    })
    expect(options.length).toBe(4)
    expect(new Set(options).size).toBe(4)
  })

  it('degrades gracefully when the pool is small', () => {
    const options = buildOptions({
      expected: 'right',
      pool: [],
      rng: createRng(31),
    })
    expect(options).toEqual(['right'])
  })

  it('never contains blank distractors', () => {
    const options = buildOptions({
      expected: 'right',
      pool: ['', '   ', 'ok'],
      rng: createRng(32),
    })
    expect(options).toContain('right')
    expect(options).not.toContain('')
    expect(options.every((o) => o.trim() !== '')).toBe(true)
  })
})