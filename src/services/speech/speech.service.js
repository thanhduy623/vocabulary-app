// Speech (TTS) service — Web Speech API wrapper (docs/learning-engine.md §8,
// AMB-12). Isolates window.speechSynthesis behind a small contract so Vue
// components never touch the browser audio API directly.
//
// Contract:
//   - speak(text, lang)     → plays text in the collection language (BR-48)
//   - stopSpeaking()        → cancels any in-progress utterance
//   - isSpeechAvailable()   → feature detection
// All calls are safe when TTS is unavailable.

/** @returns {boolean} whether speech synthesis is available */
export function isSpeechAvailable() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/**
 * Normalize a collection symbol / BCP-47 tag to a safe utterance lang hint.
 * @param {string} [lang] e.g. 'en', 'vi', 'cn', 'zh-CN'
 * @returns {string}
 */
export function normalizeLang(lang) {
  return String(lang ?? '').trim()
}

/**
 * Pick the best available voice for a language hint, preferring an exact
 * lang match, then a region prefix (symbol 'en' → voice 'en-US').
 * @param {string} [lang]
 * @returns {SpeechSynthesisVoice|null}
 */
export function pickVoice(lang) {
  if (!isSpeechAvailable()) return null
  const base = normalizeLang(lang).toLowerCase()
  const voices = window.speechSynthesis.getVoices?.() ?? []
  if (!base || voices.length === 0) return null
  return (
    voices.find((v) => v.lang.toLowerCase() === base) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${base}-`)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  )
}

/**
 * Speak text via the Web Speech API using the collection language code (BR-48).
 * @param {string} text
 * @param {string} [lang] collection symbol used for pronunciation (BR-10)
 * @returns {{ ok: boolean, reason?: string }}
 */
export function speak(text, lang) {
  if (!isSpeechAvailable()) {
    return { ok: false, reason: 'Speech Synthesis is not supported in this browser' }
  }

  const utterance = new SpeechSynthesisUtterance(String(text ?? ''))
  const normalized = normalizeLang(lang)
  if (normalized) utterance.lang = normalized
  const voice = pickVoice(normalized)
  if (voice) utterance.voice = voice

  window.speechSynthesis.cancel()
  const wasSpoken = window.speechSynthesis.speak(utterance)
  return {
    ok: typeof wasSpoken === 'boolean' ? wasSpoken : true,
  }
}

/**
 * Cancel any in-progress speech.
 * @returns {void}
 */
export function stopSpeaking() {
  if (isSpeechAvailable()) {
    window.speechSynthesis.cancel()
  }
}