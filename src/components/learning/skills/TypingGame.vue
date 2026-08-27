<script setup>
// TYPING game (FR-L09, BR-50..52, requirement §2.4.4).
//
// UI responsibilities only — item generation, mode filtering and all session
// rules (queue, retry re-insertion, progress, completion) live in the engine
// via learningStore. Feedback correctness uses the SAME engine evaluate().
//   - on entry the learner picks a MODE (word-based or transcription-based
//     practice); this re-generates the TYPING plan via store.startTypingMode
//   - type the answer; Enter or "Kiểm tra" checks
//   - correct → green + auto-advance after ~1.2s, marked learned
//   - wrong   → red + full vocabulary popup; waits for "Đã học" (re-queued)

import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@/stores/learningStore'
import { speak, stopSpeaking } from '@/services/speech'
import { getSkill } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'
import VocabularyDetailModal from '@/components/learning/VocabularyDetailModal.vue'

const emit = defineEmits(['completed'])
const store = useLearningStore()

const item = computed(() => store.currentItem)
const progress = computed(() => store.currentProgress)

/** Selected practice mode: null (pick) | 'word' | 'transcription'. */
const mode = ref(null)
/** Whether the mode-picker is shown (while no mode has been chosen). */
const showModePicker = computed(() => mode.value === null)

/** Practice modes offered to the learner (map to engine TYPING_MODE filter). */
const MODE_OPTIONS = [
  {
    id: 'transcription',
    label: 'Luyện phiên âm',
    description: 'Hiện từ tiếng Anh / nghĩa → bạn gõ phiên âm.',
  },
  {
    id: 'word',
    label: 'Luyện từ',
    description: 'Hiện phiên âm / nghĩa → bạn gõ từ tiếng Anh.',
  },
]

/** Input bound to a template ref so we can focus it. */
const inputEl = ref(null)
/** Current text in the input. */
const typedValue = ref('')
/** The value that was submitted (locked-in once answered). */
const submittedValue = ref('')
/** Whether the learner has answered the current item. */
const submitted = ref(false)
/** If the submitted answer was correct. */
const wasCorrect = ref(false)
/** Set while the last TTS attempt failed so the UI can hint (AMB-12). */
const speechUnavailable = ref(false)
/** Whether the wrong-answer vocab modal is open. */
const showDetail = ref(false)

/** Pending auto-advance timer set after a CORRECT answer. */
let advanceTimer = null
const AUTO_ADVANCE_DELAY = 1200
function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
}

/** Full source word for the vocab detail modal. */
const sourceWord = computed(
  () =>
    (store.learningSession?.words ?? []).find(
      (w) => w.id === item.value?.sourceWordId,
    ) ?? null,
)

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

/** Human-facing prompt label by question template (empty input hint). */
const QUESTION_LABELS = {
  'type-word-transcription': 'Nhìn từ · điền phiên âm',
  'type-transcription-word': 'Nhìn phiên âm · điền từ',
  'type-meaning-word': 'Nhìn nghĩa · điền từ',
}

const questionLabel = computed(
  () => QUESTION_LABELS[item.value?.template] ?? 'Gõ câu trả lời',
)

/** Human names of the word fields (shown so the learner knows what to type). */
const FIELD_LABELS = {
  word: 'từ',
  transcription: 'phiên âm',
  meaning: 'nghĩa',
}

/** What this question expects the learner to type (the target field). */
const targetLabel = computed(
  () => FIELD_LABELS[item.value?.payload?.targetField] ?? 'câu trả lời',
)

/** Uppercase variant for the "Gõ: TỪ / PHIÊN ÂM" badge. */
const targetLabelUpper = computed(() => targetLabel.value.toUpperCase())

/** Dynamic input placeholder: "Gõ phiên âm tại đây…" / "Gõ từ tại đây…" */
const placeholderText = computed(() => `Gõ ${targetLabel.value} tại đây…`)

/** Evaluate the current typed value with the engine's own rule (pure, DRY). */
function evaluateTyped() {
  if (!item.value) return false
  const result = getSkill(item.value.skillId).evaluate(item.value, {
    value: typedValue.value,
  })
  return result.correct
}

/** Live trimmed length (disable Kiểm tra on empty input). */
const isEmpty = computed(() => !typedValue.value.trim())

/** Input styling after answering: green = correct, red = wrong. */
const feedbackClass = computed(() => {
  if (!submitted.value) return ''
  return wasCorrect.value ? 'is-correct' : 'is-wrong'
})

// Reset the input + answer state, auto-play, and ensure the picker shows
// until a mode is chosen.
watch(
  () => item.value?.id,
  async () => {
    clearAdvanceTimer()
    typedValue.value = ''
    submittedValue.value = ''
    submitted.value = false
    wasCorrect.value = false
    showDetail.value = false
    await nextTick()
    inputEl.value?.focus()
    speakCurrent()
  },
  { immediate: true },
)

/** Pick the practice mode and (re)start the typing skill for it. */
function selectMode(chosen) {
  if (store.startTypingMode(chosen)) {
    mode.value = chosen
  }
}

/** Check the typed answer: lock input, show feedback, then drive advance. */
function check() {
  if (!item.value || submitted.value || isEmpty.value) return
  submittedValue.value = typedValue.value
  wasCorrect.value = evaluateTyped()
  submitted.value = true

  if (wasCorrect.value) {
    // Correct → green, brief pause, then auto-advance + mark learned.
    clearAdvanceTimer()
    advanceTimer = setTimeout(() => {
      advanceTimer = null
      next()
    }, AUTO_ADVANCE_DELAY)
  } else {
    // Wrong → red + show the vocabulary detail popup; waits for "Đã học".
    showDetail.value = true
  }
}

/** Commit the submitted answer to the engine and move on. */
function next() {
  if (!item.value || !submitted.value) return
  clearAdvanceTimer()
  store.answerActive({ value: submittedValue.value })
  submitted.value = false
  wasCorrect.value = false
  showDetail.value = false
  if (store.isSkillCompletedNow) emit('completed')
}

/** "Đã học" modal button → advance (re-queues a wrong item). */
function onLearned() {
  next()
}

/** Enter on the input (only checks; advancing is automatic or via modal). */
function onInputEnter() {
  if (!submitted.value) check()
}

onBeforeUnmount(() => {
  clearAdvanceTimer()
  stopSpeaking()
})

// Notify parent immediately when this skill is already finished.
if (store.isSkillCompletedNow) emit('completed')
</script>

<template>
  <div class="typing-game">
    <ProgressStats v-if="progress" :progress="progress" />

    <!-- MODE PICKER: choose what to type before practice starts -->
    <div v-if="showModePicker" class="type-picker mx-auto my-2">
      <h2 class="h5 text-center mb-2">Chọn chế độ luyện gõ</h2>
      <p class="text-muted small text-center mb-3">Chọn loại bạn muốn gõ để bắt đầu.</p>

      <div class="row g-3">
        <div v-for="opt in MODE_OPTIONS" :key="opt.id" class="col-12 col-sm-6">
          <button
            type="button"
            class="card h-100 w-100 border text-start p-3 type-mode-card"
            @click="selectMode(opt.id)"
          >
            <div class="fw-semibold mb-1">{{ opt.label }}</div>
            <div class="small text-muted">{{ opt.description }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- QUESTION MODE -->
    <template v-else>
      <div v-if="item" class="type-panel mx-auto my-1">
        <!-- Question type → answer type hint -->
        <div class="type-head" role="group" aria-label="Loại câu hỏi">
          <span class="badge type-badge-key">{{ questionLabel }}</span>
          <span class="type-arrow" aria-hidden="true">→</span>
          <span class="badge type-badge-answer">Gõ: {{ targetLabelUpper }}</span>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary type-replay"
            :title="speechUnavailable ? 'Thiết bị không hỗ trợ đọc phát âm' : 'Nghe lại'"
            aria-label="Nghe lại phát âm"
            @click="replayAudio"
          >
            🔊 Nghe
          </button>
        </div>

        <!-- The prompt (the "key" shown to the learner) -->
        <p class="type-prompt">{{ item.payload.prompt }}</p>

        <!-- Targeted input -->
        <div class="type-input-row">
          <input
            ref="inputEl"
            v-model="typedValue"
            type="text"
            class="form-control form-control-lg type-input"
            :class="feedbackClass"
            :disabled="submitted"
            :readonly="submitted"
            :aria-invalid="submitted && !wasCorrect"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="placeholderText"
            @keydown.enter.prevent="onInputEnter"
          />
        </div>

        <!-- Feedback -->
        <div
          v-if="submitted"
          class="type-feedback"
          :class="wasCorrect ? 'text-success' : 'text-danger'"
          role="status"
        >
          <template v-if="wasCorrect">Chính xác ✓ — tiếp tục tự động…</template>
          <template v-else>
            Sai rồi — {{ targetLabel }} đúng:
            <span class="fw-semibold">{{ item.payload.expected }}</span>
          </template>
        </div>

        <!-- Actions: only "Kiểm tra" (advance is automatic or via modal) -->
        <div class="d-flex justify-content-between align-items-center mt-3 type-actions">
          <small class="text-muted">Enter để kiểm tra</small>
          <button
            v-if="!submitted"
            type="button"
            class="btn btn-primary"
            :disabled="isEmpty"
            @click="check"
          >
            Kiểm tra
          </button>
        </div>
      </div>

      <!-- Wrong answer: study card with full details; only "Đã học" advances -->
      <VocabularyDetailModal
        v-if="showDetail"
        :word="sourceWord"
        :was-correct="false"
        @learned="onLearned"
      />
    </template>
  </div>
</template>

<style scoped>
.type-picker {
  width: min(560px, 100%);
}

.type-mode-card {
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}
.type-mode-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.type-panel {
  width: min(560px, 100%);
  padding: 1.25rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.9rem;
  background-color: var(--bs-body-bg, #fff);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
}

.type-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.type-badge-key {
  font-size: 0.9rem;
  padding: 0.45em 0.8em;
}

.type-badge-answer {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background-color: var(--bs-primary);
  color: #fff;
  padding: 0.45em 0.8em;
}

.type-arrow {
  color: var(--bs-secondary);
  font-weight: 700;
}

.type-prompt {
  font-size: 1.35rem;
  font-weight: 600;
  text-align: center;
  overflow-wrap: anywhere;
  margin-bottom: 1.25rem;
  min-height: 1.5em;
}

.type-input-row {
  margin-bottom: 1rem;
}

.type-input {
  text-align: center;
  font-size: 1.15rem;
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
}

.type-input.is-correct {
  border-color: var(--bs-success);
  background-color: var(--bs-success-bg-subtle, #d1e7dd);
  color: var(--bs-success);
  box-shadow: 0 0 0 0.25rem rgba(25, 135, 84, 0.15);
}

.type-input.is-wrong {
  border-color: var(--bs-danger);
  background-color: var(--bs-danger-bg-subtle, #f8d7da);
  color: var(--bs-danger);
  box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.15);
}

.type-feedback {
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
}
</style>