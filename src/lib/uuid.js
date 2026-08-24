// UUID v4 helpers (BR-1: entity IDs are client-generated UUIDs).

/**
 * Generate a UUID v4 string.
 * Uses the Web Crypto API when available, otherwise falls back to a
 * Math.random()-based RFC-4122-compatible generator.
 *
 * @returns {string} e.g. 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Validate that a value looks like a UUID v4 string.
 * @param {string} value
 * @returns {boolean}
 */
export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ''),
  )
}

export default uuid