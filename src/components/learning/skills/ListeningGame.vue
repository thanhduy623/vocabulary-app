<script setup>
// LISTENING game (FR-L08, BR-48..49, requirement §2.4.3).
//
// UI responsibilities only — item generation (audioText/options/expected) and
// all session rules (queue, retry re-insertion, progress, completion) live in
// the engine via learningStore. Playback (auto-play, replay, collection
// language) lives in services/speech — this component never touches the Web
// Speech API directly.
//   - a new question auto-plays the word via TTS in the collection language
//   - 🔊 replay button re-pronounces it at any time
//   - pick an option → instant green/red feedback locked until Tiếp theo
//   - Next commits to the engine: wrong answers are re-queued randomly (BR-46)
//   - keyboard: 1–4 pick, Enter → Tiếp theo, R → replay

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@/stores/learningStore'
import { speak, stopSpeaking } from '@/services/speech'
import ProgressStats from '@/components/learning/ProgressStats.vue'

const emit = defineEmits(['completed'])

const store = useLearningStore()

const item = computed(() => store.currentItem)
const progress = computed(() => store.currentProgress)

/** Index of the option the learner picked (null until answered). */
const selectedIndex = ref(null)
/** If the chosen option was correct (only meaningful once answered). */
const wasCorrect = ref(false)
/** Set while the last TTS attempt failed so the UI can hint (AMB-12). */
const speechUnavailable = ref(false)

const options = computed(() => item.value?.payload?.options ?? [])
const correctIndex = computed(() =>
  options.value.indexOf(item.value?.payload?.expected ?? ''),
)

/** Prompt label by answer target — audio always speaks the word (AMB-2). */
const TARGET_LABELS = {
  'listen-word': 'Chọn từ bạn vừa nghe',
  'listen-transcription': 'Chọn phiên âm của từ bạn vừa nghe',
  'listen-meaning': 'Chọn nghĩa của từ bạn vừa nghe',
}

const questionLabel = computed(
  () => TARGET_LABELS[item.value?.payload?.target] ?? 'Chọn đáp án đúng',
)

const answered = computed(() => selectedIndex.value !== null)

/** Speak the current word via the speech service (collection language). */
function speakCurrent() {
  if (!item.value) return
  const result = speak(item.value.payload.audioText, store.sessionLang)
  speechUnavailable.value = !result.ok
}

function replayAudio() {
  speakCurrent()
}

// Reset the answer state and auto-play whenever the question changes.
watch(
  () => item.value?.id,
  () => {
    selectedIndex.value = null
    wasCorrect.value = false
    speakCurrent()
  },
  { immediate: true },
)

/** Pick an option (no-op once answered — answer is locked). */
function pick(index) {
  if (!item.value || answered.value) return
  selectedIndex.value = index
  wasCorrect.value = index === correctIndex.value
}

/** Commit the chosen answer to the engine and move on. */
function next() {
  if (!item.value || !answered.value) return
  const option = options.value[selectedIndex.value]
  const result = store.answerActive({ option })
  selectedIndex.value = null
  wasCorrect.value = false
  if (result?.skillCompleted) emit('completed')
}

/** CSS classes for each option (locked feedback once answered). */
function optionClass(index) {
  const base = 'btn listen-option'
  if (!answered.value) return `${base} is-feedback`
  if (index === correctIndex.value) return `${base} is-correct`
  if (index === selectedIndex.value) return `${base} is-wrong`
  return `${base} is-dimmed`
}

// --- keyboard: 1–4 pick, Enter goes next, R replays -------------------------
function onKeydown(event) {
  const tag = event.target?.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return
  }
  if (!item.value) return
  const num = Number(event.key)
  if (num >= 1 && num <= options.value.length && !answered.value) {
    event.preventDefault()
    pick(num - 1)
    return
  }
  if (event.key === 'Enter' && answered.value) {
    event.preventDefault()
    next()
    return
  }
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault()
    replayAudio()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopSpeaking()
})

// Notify parent immediately when this skill is already finished.
if (store.isSkillCompletedNow) emit('completed')
</script>

<template>
  <div class="listening-game">
    <ProgressStats v-if="progress" :progress="progress" />

    <div v-if="item" class="listen-panel mx-auto my-1">
      <span class="badge text-bg-secondary mb-2">{{ questionLabel }}</span>

      <!-- Audio prompt area: auto-plays on new question; replay on demand -->
      <div class="listen-audio text-center my-3">
        <button
          type="button"
          class="btn btn-outline-primary btn-lg listen-replay"
          :title="speechUnavailable ? 'Thiết bị không hỗ trợ đọc phát âm' : 'Nghe lại'"
          aria-label="Nghe lại"
          @click="replayAudio"
        >
          <span class="listen-replay-icon">🔊</span>
          <span class="d-block fs-6 mt-1">Nghe lại</span>
        </button>
        <p v-if="speechUnavailable" class="text-warning small mb-0 mt-2">
          Thiết bị không hỗ trợ đọc phát âm.
        </p>
      </div>

      <div class="listen-options" role="listbox">
        <button
          v-for="(option, index) in options"
          :key="`${item.id}-${index}`"
          type="button"
          :class="optionClass(index)"
          :aria-pressed="selectedIndex === index"
          @click="pick(index)"
        >
          <span class="listen-letter">{{ 'ABCD'[index] }}</span>
          <span class="listen-option-text">{{ option }}</span>
          <span v-if="answered && index === selectedIndex" class="listen-mark">
            {{ wasCorrect ? '✓' : '✗' }}
          </span>
        </button>
      </div>

      <div
        v-if="answered"
        class="listen-feedback"
        :class="wasCorrect ? 'text-success' : 'text-danger'"
        role="status"
      >
        <template v-if="wasCorrect">Chính xác ✓</template>
        <template v-else>
          Sai rồi — đáp án đúng được tô <span class="fw-semibold">xanh</span>.
        </template>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-muted">Phím: 1–4 chọn · R nghe lại · Enter tiếp theo</small>
        <button
          type="button"
          class="btn btn-primary"
          :class="{ 'visually-hidden': !answered }"
          @click="next"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.listen-panel {
  width: min(560px, 100%);
}

.listen-audio .listen-replay {
  padding: 1rem 2rem;
  border-radius: 0.9rem;
}

.listen-replay-icon {
  font-size: 2.2rem;
  line-height: 1;
}

.listen-options {
  display: grid;
  gap: 0.6rem;
}

.listen-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 1.05rem;
  color: var(--bs-body-color, #212529);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, opacity 0.15s;
}

.listen-option.is-feedback:hover,
.listen-option.is-feedback:focus-visible {
  border-color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle, rgba(13, 110, 253, 0.08));
}

.listen-option.is-correct,
.listen-option.is-wrong,
.listen-option.is-dimmed {
  cursor: default;
}

.listen-letter {
  flex: 0 0 auto;
  width: 1.9rem;
  height: 1.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  font-weight: 700;
}

.listen-option-text {
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.listen-mark {
  flex: 0 0 auto;
  font-weight: 800;
}

.listen-option.is-correct {
  border-color: var(--bs-success);
  background-color: var(--bs-success-bg-subtle, #d1e7dd);
  color: var(--bs-success);
}

.listen-option.is-wrong {
  border-color: var(--bs-danger);
  background-color: var(--bs-danger-bg-subtle, #f8d7da);
  color: var(--bs-danger);
}

.listen-option.is-dimmed {
  opacity: 0.55;
}

.listen-feedback {
  margin-top: 1rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
}
</style>