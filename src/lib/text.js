// String utilities: locale sorting, normalization, diacritic folding.

/** @type {Intl.Collator} */
let viCollator

/**
 * Compare two strings using Vietnamese-aware collation (BR-15, BR-24).
 * Falls back to default locale when 'vi' is unavailable.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function localeCompare(a, b) {
  if (!viCollator) {
    viCollator = new Intl.Collator('vi', { sensitivity: 'base' })
  }
  return viCollator.compare(String(a), String(b))
}

/**
 * Sort an array of objects by a string key (A → Z, locale-aware).
 * Mutates a copy and returns it; the input array is untouched.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} selector
 * @returns {T[]}
 */
export function sortByLocale(items, selector) {
  return [...items].sort((x, y) => localeCompare(selector(x), selector(y)))
}

/**
 * Normalize a user's typed answer for lenient comparison (BR-50):
 * trim, lowercase, and collapse inner whitespace.
 * @param {string} value
 * @returns {string}
 */
export function normalizeForCompare(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US')
}

// Unicode decomposition table used to strip diacritics (optional AMB-13).
const DIACRITICS_MAP = {
  a: 'aàáảãạăằắẳẵặâầấẩẫậ',
  e: 'eèéẻẽẹêềếểễệ',
  i: 'iìíỉĩị',
  o: 'oòóỏõọôồốổỗộơờớởỡợ',
  u: 'uùúủũụưừứửữự',
  y: 'yỳýỷỹỵ',
  d: 'dđ',
}

/** @type {Record<string, string>|null} */
let diacriticLookup = null

/**
 * Fold Vietnamese diacritics (optional; used when config flag enabled).
 * @param {string} value
 * @returns {string}
 */
export function foldDiacritics(value) {
  const str = String(value ?? '')
  if (str.length === 0) return str

  if (!diacriticLookup) {
    diacriticLookup = {}
    for (const [base, variants] of Object.entries(DIACRITICS_MAP)) {
      for (const ch of variants) diacriticLookup[ch] = base
    }
  }

  return [...str]
    .map((ch) => diacriticLookup[ch] || ch)
    .join('')
}

/**
 * Strict answer comparison (TYPING skill default; BR-50).
 * @param {string} typed
 * @param {string} expected
 * @param {{ foldDiacritics?: boolean }} [options]
 * @returns {boolean}
 */
export function isTypedAnswerCorrect(typed, expected, { foldDiacritics: fold = false } = {}) {
  let a = normalizeForCompare(typed)
  let b = normalizeForCompare(expected)
  if (fold) {
    a = foldDiacritics(a)
    b = foldDiacritics(b)
  }
  return a === b
}