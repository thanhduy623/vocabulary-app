// Public entry point of the speech (TTS) service.
//
// Components import from '@/services/speech' — they never call the Web Speech
// API directly. Speech synthesis lives here and here only.

export {
  isSpeechAvailable,
  normalizeLang,
  getVoices,
  pickVoice,
  speak,
  stopSpeaking,
} from './speech.service'