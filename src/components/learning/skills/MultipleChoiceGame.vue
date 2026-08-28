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
import AudioPlayButton from '@/components/learning/AudioPlayButton.vue'
import VocabularyDetailModal from '@/components/learning/VocabularyDetailModal.vue'

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

/** Pending auto-advance timer set after a CORRECT pick. */
let advanceTimer = null
/** Delay (ms) after a correct answer before auto-advancing. */
const AUTO_ADVANCE_DELAY = 1400

/** Whether the wrong-answer detail modal is currently open. */
const showDetail = ref(false)

/** Full source word for the detail modal. */
const sourceWord = computed(
  () =>
    (store.learningSession?.words ?? []).find(
      (w) => w.id === item.value?.sourceWordId,
    ) ?? null,
)

/** Clear any pending auto-advance timer. */
function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
}

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

// Reset the answer state whenever the question changes.
watch(
  () => item.value?.id,
  () => {
    clearAdvanceTimer()
    selectedIndex.value = null
    wasCorrect.value = false
    showDetail.value = false
    // speakCurrent()
  },
  { immediate: true },
)

/** Pick an option (no-op once answered — answer is locked). */
function pick(index) {
  if (!item.value || answered.value) return
  selectedIndex.value = index
  wasCorrect.value = index === correctIndex.value
  // Auto-pronounce the word after the choice so the answer is reinforced.
  speakCurrent()

  if (wasCorrect.value) {
    // Correct → brief pause for the green highlight, then auto-advance.
    clearAdvanceTimer()
    advanceTimer = setTimeout(() => {
      advanceTimer = null
      next()
    }, AUTO_ADVANCE_DELAY)
  } else {
    // Wrong → reveal correct answer (green) + show study card; wait for user.
    showDetail.value = true
  }
}

/**
 * Commit the answer to the engine and advance to the next item. Correct
 * answers master the item; wrong answers are re-queued randomly (the engine
 * decides via submitAnswer) so the item will reappear.
 */
function next() {
  if (!item.value || !answered.value) return
  const option = options.value[selectedIndex.value]
  const result = store.answerActive({ option })
  selectedIndex.value = null
  wasCorrect.value = false
  showDetail.value = false
  if (result?.skillCompleted) emit('completed')
}

/** "Đã học" modal button — advance (re-queues a wrong item). */
function onLearned() {
  next()
}

/** CSS classes for each option (locked feedback once answered). */
function optionClass(index) {
  const base = 'btn mcq-option'
  if (!answered.value) return `${base} is-feedback` // ensures cursor only after lock
  if (index === correctIndex.value) return `${base} is-correct`
  if (index === selectedIndex.value) return `${base} is-wrong`
  return `${base} is-dimmed`
}

// --- keyboard: 1–4 pick an option -------------------------------------------
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
  // Keyboard parity (FR-X04): Enter commits & advances, same as the mouse flow.
  if (event.key === 'Enter' && answered.value) {
    event.preventDefault()
    next()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopSpeaking()
  clearAdvanceTimer()
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
        <AudioPlayButton
          variant="icon"
          aria-label="Nghe lại"
          :unavailable="speechUnavailable"
          @play="replayAudio"
        />
      </div>

      <p v-if="speechUnavailable" class="text-warning small mb-2">
        Thiết bị không hỗ trợ đọc phát âm.
      </p>

      <p class="mcq-prompt">{{ item.payload.prompt }}</p>

      <div class="mcq-options" role="group" aria-label="Các đáp án">
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
        <!-- §7.3: feedback text + auto-advance hint (color pairs with icon) -->
        <template v-if="wasCorrect">✓ Chính xác! — tiếp tục tự động…</template>
        <template v-else>
          ✗ Chưa đúng — đáp án đúng được đánh dấu ✓. Xem chi tiết để học lại.
        </template>
      </div>
    </div>

    <!-- Wrong answer: study card with full details; only "Đã học" advances -->
    <VocabularyDetailModal
      v-if="showDetail"
      :word="sourceWord"
      :was-correct="false"
      @learned="onLearned"
    />
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
  min-height: 44px; /* touch target (§10) */
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 1.05rem;
  color: var(--bs-body-color);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, opacity 0.15s;
}

.mcq-option.is-feedback:hover,
.mcq-option.is-feedback:focus-visible {
  border-color: var(--app-brand);
  background-color: rgba(var(--app-brand-rgb), 0.08);
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
  background-color: var(--app-bg);
  border: 1px solid var(--app-border);
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
  background-color: rgba(var(--bs-success-rgb), 0.1);
  color: var(--bs-success);
}

.mcq-option.is-wrong {
  border-color: var(--bs-danger);
  background-color: rgba(var(--bs-danger-rgb), 0.1);
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