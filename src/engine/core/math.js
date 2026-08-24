// Seeded randomization utilities (docs/learning-engine.md §6).
// Pure functions — a seed makes item generation reproducible for tests/replay.

/**
 * Create a deterministic PRNG (mulberry32).
 * @param {number} seed  32-bit integer
 * @returns {() => number} function producing floats in [0, 1)
 */
export function createRng(seed) {
  let t = Number(seed) >>> 0
  if (t === 0) t = 0x9e3779b9 // avoid the all-zero degenerate state
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Resolve an optional seed to a concrete integer. */
export function resolveSeed(seed) {
  const n = Number(seed)
  if (Number.isInteger(n) && n > 0) return n >>> 0
  return Math.floor(Math.random() * 2147483647) + 1
}

/**
 * Inclusive integer in [min, max].
 * @param {() => number} rng
 */
export function randomInt(rng, min, max) {
  if (max < min) return min
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Fisher–Yates shuffle (returns a new array; input untouched).
 * @template T
 * @param {T[]} items
 * @param {() => number} rng
 * @returns {T[]}
 */
export function shuffle(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Pick up to `count` distinct values from a candidate pool.
 *
 * Rules (BR-45 / AMB-5):
 *  - skips empty/whitespace-only values,
 *  - skips anything in `exclude`,
 *  - de-duplicates by value,
 *  - never mutates inputs; result order is RNG-driven.
 *
 * @param {string[]} pool       candidate values (e.g. same field of other words)
 * @param {number} count        how many to pick
 * @param {{exclude?: string[], rng: () => number}} options
 * @returns {string[]}
 */
export function pickDistractors(pool, count, { exclude = [], rng }) {
  const excluded = new Set(exclude)
  const seen = new Set()
  const unique = []
  for (const raw of pool) {
    const value = String(raw ?? '')
    if (!value.trim()) continue
    if (excluded.has(value)) continue
    if (seen.has(value)) continue
    seen.add(value)
    unique.push(value)
  }
  return shuffle(unique, rng).slice(0, Math.max(0, count))
}

/**
 * Build shuffled answer options for choice-based skills: the expected value
 * plus up to `count − 1` distractors. The expected value is always included.
 *
 * @param {{expected: string, pool: string[], count?: number, rng: () => number}} params
 * @returns {string[]}
 */
export function buildOptions({ expected, pool, count = 4, rng }) {
  const distractors = pickDistractors(pool, count - 1, {
    exclude: [expected],
    rng,
  })
  return shuffle([expected, ...distractors], rng)
}