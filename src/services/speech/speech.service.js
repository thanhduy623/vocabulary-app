// Speech (TTS) service — Web Speech API wrapper (docs/learning-engine.md §8,
// AMB-12). Isolates window.speechSynthesis behind a small contract so Vue
// components never touch the browser audio API directly.
//
// Accuracy strategy:
//   - Standard-language tags: the collection symbol (BR-10) is mapped to a
//     canonical BCP-47 tag (vi → vi-VN, en → en-US, cn/zh → zh-CN, ko → ko-KR,
//     ja → ja-JP, …) so the right voice is always selected.
//   - Word-by-word reading: text is split on whitespace and each token is
//     spoken as its own utterance (chained via onend). Individual words are
//     pronounced far more accurately by the speech engines than a whole string
//     (especially for shorter/toptonal languages like Vietnamese, Chinese,
//     Korean). CJK text without spaces stays a single chunk — there is no
//     reliable client-side word tokenizer for those scripts.
//
// Contract (backward compatible):
//   - speak(text, lang, options?) → { ok, reason? }
//   - stopSpeaking() → cancels any in-progress (or chained) speech
//   - isSpeechAvailable() / normalizeLang() / pickVoice() → helpers
// All calls are safe when TTS is unavailable.

/** Standard collection symbols / tags → canonical BCP-47 voice tags. */
const STANDARD_LANG_TAGS = Object.freeze({
  // Vietnamese
  vi: 'vi-VN',
  vietnamese: 'vi-VN',
  // English
  en: 'en-US',
  english: 'en-US',
  'en-us': 'en-US',
  'en-gb': 'en-GB',
  'en-uk': 'en-GB',
  'en-au': 'en-AU',
  // Chinese
  zh: 'zh-CN',
  cn: 'zh-CN',
  chinese: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-HK',
  // Korean / Japanese
  ko: 'ko-KR',
  korean: 'ko-KR',
  'ko-kr': 'ko-KR',
  ja: 'ja-JP',
  japanese: 'ja-JP',
  // Other common languages
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  th: 'th-TH',
  id: 'id-ID',
})

/** @returns {boolean} whether speech synthesis is available */
export function isSpeechAvailable() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/**
 * Normalize a collection symbol / language code to a canonical BCP-47 tag
 * (e.g. 'vi' → 'vi-VN', 'cn' → 'zh-CN'). Already-regional tags pass through.
 * @param {string} [lang] e.g. 'en', 'vi', 'cn', 'ko', 'zh-CN'
 * @returns {string}
 */
export function normalizeLang(lang) {
  const raw = String(lang ?? '').trim().toLowerCase()
  if (!raw) return ''
  if (STANDARD_LANG_TAGS[raw]) return STANDARD_LANG_TAGS[raw]
  if (raw.includes('-')) return raw
  return raw
}

/**
 * Pick the best available voice for a language hint, preferring an exact
 * canonical tag match, then a region prefix fallback.
 * @param {string} [lang]
 * @returns {SpeechSynthesisVoice|null}
 */
/**
 * The current item's WORD field is the most reliable text to pronounce, so
 * skills carry it as item.payload.audioText and always speak that field.
 */

export function pickVoice(lang) {
  if (!isSpeechAvailable()) return null
  const base = normalizeLang(lang).toLowerCase()
  const voices = getVoices()
  if (!base || voices.length === 0) return null
  const primary = base.split('-')[0]
  return (
    voices.find((v) => v.lang.toLowerCase() === base) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${base}-`)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(primary)) ??
    null
  )
}

let voiceCache = []
let voiceCacheLoaded = false

/** Refresh the cached voice list (browsers load voices asynchronously). */
function refreshVoices() {
  voiceCache = window.speechSynthesis.getVoices?.() ?? []
}

/** Lazily (re)populate the voice cache, incl. a one-time voiceschanged hook. */
function ensureVoicesLoaded() {
  if (!isSpeechAvailable()) return
  const first = !voiceCacheLoaded
  voiceCacheLoaded = true
  if (first) {
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
  }
  refreshVoices()
}

/** @returns {SpeechSynthesisVoice[]} currently available voices */
export function getVoices() {
  ensureVoicesLoaded()
  return [...voiceCache]
}

let speechSerial = 0

/**
 * Speak text in the collection language via the Web Speech API (BR-48).
 *
 * Accuracy strategy: the text is read WORD-BY-WORD (split on whitespace, one
 * utterance per word, chained via onend). Individual words are pronounced far
 * more accurately than a whole string — especially for Vietnamese, Chinese and
 * Korean. Space-less scripts (CJK) stay a single chunk because there is no
 * reliable client-side word tokenizer for them. Callers get the most accurate
 * results by passing the WORD field (item.payload.audioText).
 *
 * @param {string} text
 * @param {string} [lang] collection symbol / BCP-47 tag (BR-10)
 * @param {{ rate?: number }} [options]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function speak(text, lang, options = {}) {
  if (!isSpeechAvailable()) {
    return { ok: false, reason: 'Speech Synthesis is not supported in this browser' }
  }

  const normalized = normalizeLang(lang)
  const voice = pickVoice(normalized)
  const chunk = String(text ?? '').trim()
  if (!chunk) return { ok: true }

  // Invalidate any previous chained series and start a fresh one.
  speechSerial += 1
  const serial = speechSerial
  window.speechSynthesis.cancel()

  const hasSpaces = /\s/.test(chunk)
  const queue = hasSpaces ? chunk.split(/\s+/).filter(Boolean) : [chunk]

  const playNext = () => {
    if (serial !== speechSerial) return // a newer speak()/stopSpeaking() ran
    const word = queue.shift()
    if (!word) return

    const utterance = new SpeechSynthesisUtterance(word)
    if (normalized) utterance.lang = normalized
    if (voice) utterance.voice = voice
    utterance.rate = Number(options.rate) || 1
    utterance.onend = playNext
    // A missing voice for the language shouldn't hang the chain.
    utterance.onerror = () => {
      if (serial === speechSerial) playNext()
    }
    window.speechSynthesis.speak(utterance)
  }

  playNext()
  return { ok: true }
}

/**
 * Cancel any in-progress (or chained) speech.
 * @returns {void}
 */
export function stopSpeaking() {
  speechSerial += 1
  if (isSpeechAvailable()) {
    window.speechSynthesis.cancel()
  }
}