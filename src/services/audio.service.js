// Deprecated alias — the speech (TTS) service now lives in services/speech/.
// Kept as a re-export so existing imports keep working; new code should
// import from '@/services/speech' (the canonical path, see speech/index.js).

export {
  isSpeechAvailable,
  normalizeLang,
  pickVoice,
  speak,
  stopSpeaking,
} from './speech'