// Audio (TTS) service — Web Speech API wrapper (docs/learning-engine.md §8,
// AMB-12). Isolates speechSynthesis so the UI/engine never touches it directly.
// Skeleton: contract + feature-detect; no skill wiring yet.

/** @returns {boolean} whether speech synthesis is available */
export function isSpeechAvailable() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/**
 * Speak text via the Web Speech API.
 * @param {string} text
 * @param {string} [lang]  BCP-47 tag, e.g. 'en', 'vi', 'zh-CN'
 * @returns {{ ok: boolean, reason?: string }}
 */
export function speak(text, lang) {
  if (!isSpeechAvailable()) {
    return { ok: false, reason: 'Speech Synthesis is not supported in this browser' }
  }

  const utterance = new SpeechSynthesisUtterance(String(text ?? ''))
  if (lang) utterance.lang = lang

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