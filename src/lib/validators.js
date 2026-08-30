// Collection & word field validation (business rules in docs/business-rules.md).

/**
 * Trims and validates common string fields.
 * @param {{ required?: string[], maxLengths?: Object<string, number> }} rules
 */
function createStringValidator({ required = [], maxLengths = {} } = {}) {
  return (entity) => {
    const errors = {}

    for (const key of required) {
      const value = String(entity?.[key] ?? '').trim()
      if (!value) {
        errors[key] = 'Field is required'
        continue
      }
      const max = maxLengths[key]
      if (typeof max === 'number' && value.length > max) {
        errors[key] = `Must be at most ${max} characters`
      }
    }

    return errors
  }
}

/** @type {{ required: string[], maxLengths: Object<string, number> }} */
const COLLECTION_RULES = {
  required: ['name', 'language', 'symbol'],
  maxLengths: { name: 100, language: 100, symbol: 10 },
}

/** @type {{ required: string[], maxLengths: Object<string, number> }} */
export const WORD_RULES = {
  required: ['collectionId', 'word', 'meaning'],
  maxLengths: {
    word: 200,
    transcription: 200,
    meaning: 1000,
    example: 1000,
    type: 100,
    topic: 100,
    level: 100,
  },
}

/**
 * Validate a collection payload (BR-10, BR-11).
 * @param {Object} collection  { name, language, symbol, ... }
 * @returns {Object<string, string>} empty object when valid
 */
export function validateCollection(collection = {}) {
  return createStringValidator(COLLECTION_RULES)(collection)
}

/**
 * Validate a word payload (BR-20, BR-21).
 * @param {Object} word
 * @returns {Object<string, string>} empty object when valid
 */
export function validateWord(word = {}) {
  return createStringValidator(WORD_RULES)(word)
}

/**
 * Validate the language symbol format (BR-10, e.g. vi, en, zh-CN).
 * @param {string} symbol
 * @returns {boolean}
 */
export function isValidLanguageSymbol(symbol) {
  return /^[a-z]{2,3}(-[A-Z]{2})?$/.test(String(symbol ?? '').trim())
}