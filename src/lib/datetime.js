// Date/time helpers (BR-2: immutable ISO-8601 createdAt).

/**
 * Current time as an ISO-8601 UTC string.
 * @returns {string}
 */
export function nowIso() {
  return new Date().toISOString()
}

/**
 * Create an ISO-8601 string from a Date or timestamp.
 * @param {Date|number|string} [value]
 * @returns {string}
 */
export function toIso(value = Date.now()) {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString()
}

/**
 * Parse an ISO string to a Date safely (returns null when invalid).
 * @param {string} iso
 * @returns {Date|null}
 */
export function isoToDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}