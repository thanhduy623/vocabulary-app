<script setup>
// MULTIPLE_CHOICE game (BR-44..47, requirement §2.4.2).
//
// UI responsibilities only — item generation (prompt/options/expected) and all
// session rules (queue, retry re-insertion, progress, completion) live in the
// engine via learningStore:
//   - click an option → instant local feedback (green = correct, red = wrong)
//   - after answering the choice is locked, the correct answer is revealed and
//     "Tiếp theo" appears
//   - Next commits the answer to the engine: wrong answers are re-queued
//     randomly later (BR-46) so every item must be answered correctly to finish
//   - keyboard: 1–4 pick an option, Enter submits / goes Next

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

/** Speak the current WORD (auto-plays on new questions). */
function speakCurrent() {
  if (!item.value) return
  const result = speak(
    item.value.payload.audioText || item.value.payload.prompt,
    store.sessionLang,
  )
  speechUnavailable.value = !result.ok
}

function replayAudio() {
  speakCurrent()
}

const options = computed(() => item.value?.payload?.options ?? [])
const correctIndex = computed(() =>
  options.value.indexOf(item.value?.payload?.expected ?? ''),
)

/** Human-facing prompt label by question template (QA = Q → A). */
const QUESTION_LABELS = {
  'mcq-word-transcription': 'Chọn cách phát âm của từ sau',
  'mcq-word-meaning': 'Chọn nghĩa của từ sau',
  'mcq-transcription-word': 'Chọn từ có cách phát âm sau',
  'mcq-transcription-meaning': 'Chọn nghĩa có cách phát âm sau',
  'mcq-meaning-word': 'Chọn từ có nghĩa sau',
  'mcq-meaning-transcription': 'Chọn cách phát âm có nghĩa sau',
}

const questionLabel = computed(
  () => QUESTION_LABELS[item.value?.template] ?? 'Chọn đáp án đúng',
)

const answered = computed(() => selectedIndex.value !== null)

// Reset the answer state and auto-play whenever the question changes.
watch(
  () => item.value?.id,
  () => {
    selectedIndex.value = null
    wasCorrect.value = false
    // speakCurrent()
  },
  { immediate: true },
)

/** Pick an option (no-op once answered — answer is locked). */
function pick(index) {
  if (!item.value || answered.value) return
  selectedIndex.value = index
  wasCorrect.value = index === correctIndex.value
  // Auto-play after the choice is made: re-pronounce the prompt so the
  // learner hears it right when the answer is locked in.
  speakCurrent()
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
  const base = 'btn mcq-option'
  if (!answered.value) return `${base} is-feedback` // ensures cursor only after lock
  if (index === correctIndex.value) return `${base} is-correct`
  if (index === selectedIndex.value) return `${base} is-wrong`
  return `${base} is-dimmed`
}

// --- keyboard: 1–4 pick an option, Enter goes next --------------------------
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
  <div class="multiple-choice-game">
    <ProgressStats v-if="progress" :progress="progress" />

    <div v-if="item" class="mcq-panel mx-auto my-1">
      <div class="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
        <span class="badge text-bg-secondary">{{ questionLabel }}</span>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary mcq-replay"
          :title="speechUnavailable ? 'Thiết bị không hỗ trợ đọc phát âm' : 'Nghe lại'"
          aria-label="Nghe lại phát âm"
          @click="replayAudio"
        >
          🔊 Nghe
        </button>
      </div>

      <p class="mcq-prompt">{{ item.payload.prompt }}</p>

      <div class="mcq-options" role="listbox">
        <button
          v-for="(option, index) in options"
          :key="`${item.id}-${index}`"
          type="button"
          :class="optionClass(index)"
          :aria-pressed="selectedIndex === index"
          @click="pick(index)"
        >
          <span class="mcq-letter">{{ 'ABCD'[index] }}</span>
          <span class="mcq-option-text">{{ option }}</span>
          <span v-if="answered && index === selectedIndex" class="mcq-mark">
            {{ wasCorrect ? '✓' : '✗' }}
          </span>
        </button>
      </div>

      <div
        v-if="answered"
        class="mcq-feedback"
        :class="wasCorrect ? 'text-success' : 'text-danger'"
        role="status"
      >
        <template v-if="wasCorrect">Đúng rồi ✓</template>
        <template v-else>
          Sai rồi — đáp án đúng được tô <span class="fw-semibold">xanh</span>.
        </template>
      </div>

      <div class="d-flex justify-content-end mt-3">
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
.mcq-panel {
  width: min(560px, 100%);
}

.mcq-prompt {
  font-size: 1.35rem;
  font-weight: 600;
  text-align: center;
  overflow-wrap: anywhere;
  margin-bottom: 1.25rem;
  min-height: 1.5em;
}

.mcq-options {
  display: grid;
  gap: 0.6rem;
}

.mcq-option {
  position: relative;
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

.mcq-option.is-feedback:hover,
.mcq-option.is-feedback:focus-visible {
  border-color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle, rgba(13, 110, 253, 0.08));
}

.mcq-option.is-correct,
.mcq-option.is-wrong,
.mcq-option.is-dimmed {
  cursor: default;
}

.mcq-letter {
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

.mcq-option-text {
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.mcq-mark {
  flex: 0 0 auto;
  font-weight: 800;
}

.mcq-option.is-correct {
  border-color: var(--bs-success);
  background-color: var(--bs-success-bg-subtle, #d1e7dd);
  color: var(--bs-success);
}

.mcq-option.is-wrong {
  border-color: var(--bs-danger);
  background-color: var(--bs-danger-bg-subtle, #f8d7da);
  color: var(--bs-danger);
}

.mcq-option.is-dimmed {
  opacity: 0.55;
}

.mcq-feedback {
  margin-top: 1rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
}
</style>