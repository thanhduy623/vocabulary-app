<script setup>
// TYPING game (FR-L09, BR-50..52, requirement §2.4.4).
//
// UI responsibilities only — item generation, mode filtering and all session
// rules (queue, retry re-insertion, progress, completion) live in the engine
// via learningStore. Feedback correctness uses the SAME engine evaluate().
//   - the option mix (which key→type pairs to practice) is chosen on the
//     Skill Options step before the session starts; this screen just renders
//     the resulting random mix
//   - type the answer; Enter or "Kiểm tra" checks
//   - correct → green + auto-advance after ~1.2s, marked learned
//   - wrong   → red + full vocabulary popup; waits for "Đã học" (re-queued)

import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@/stores/learningStore'
import { speak, stopSpeaking } from '@/services/speech'
import { getSkill } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'
import AudioPlayButton from '@/components/learning/AudioPlayButton.vue'
import VocabularyDetailModal from '@/components/learning/VocabularyDetailModal.vue'

const emit = defineEmits(['completed'])
const store = useLearningStore()

const item = computed(() => store.currentItem)
const progress = computed(() => store.currentProgress)

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

/** Transcription targets (IPA) render in the data monospace style (§3.2). */
const isTranscriptionTarget = computed(() => targetLabel.value === 'phiên âm')

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

// Reset the input + answer state, auto-play, and refocus the input
// whenever the current item changes.
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

    <!-- QUESTION (the option mix is chosen on the Skill Options step) -->
    <div v-if="item" class="type-panel mx-auto my-1">
        <!-- Shared uniform audio button, corner-pinned like the flashcard -->
        <AudioPlayButton
          class="type-speak position-absolute"
          variant="icon"
          aria-label="Nghe lại"
          :unavailable="speechUnavailable"
          @play="replayAudio"
        />

        <p v-if="speechUnavailable" class="text-warning small text-center mb-2">
          Thiết bị không hỗ trợ đọc phát âm.
        </p>

        <!-- Question kind reads as metadata; the prompt itself is the hero -->
        <p class="type-eyebrow">{{ questionLabel }}</p>

        <div class="type-prompt-zone">
          <p class="type-prompt" :class="{ 'is-mono': isTranscriptionTarget }">
            {{ item.payload.prompt }}
          </p>
        </div>

        <!-- Targeted input; the ✓/✗ mark sits inside the field after answering -->
        <div class="type-input-row">
          <input
            ref="inputEl"
            v-model="typedValue"
            type="text"
            class="form-control form-control-lg type-input"
            :class="[feedbackClass, { 'is-mono': isTranscriptionTarget }]"
            :disabled="submitted"
            :readonly="submitted"
            :aria-invalid="submitted && !wasCorrect"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="placeholderText"
            @keydown.enter.prevent="onInputEnter"
          />
          <span
            v-if="submitted"
            class="type-input-mark"
            :class="wasCorrect ? 'is-correct' : 'is-wrong'"
            aria-hidden="true"
          >
            {{ wasCorrect ? '✓' : '✗' }}
          </span>
          <small v-if="!submitted" class="type-enter-hint text-muted">
            Enter để kiểm tra
          </small>
        </div>

        <!-- Feedback (§7.3) -->
        <div
          v-if="submitted"
          class="type-feedback"
          :class="wasCorrect ? 'text-success' : 'text-danger'"
          role="status"
        >
          <template v-if="wasCorrect">Chính xác ✓ — tiếp tục tự động…</template>
          <template v-else>
            ✗ Chưa đúng — {{ targetLabel }} đúng:
            <strong class="type-expected">{{ item.payload.expected }}</strong>
          </template>
        </div>

        <!-- Actions: Kiểm tra while answering; Tiếp theo skips the
             auto-advance wait (next() already clears the timer) -->
        <div class="d-flex justify-content-between align-items-center mt-3 type-actions">
          <button
            v-if="!submitted"
            type="button"
            class="btn btn-primary w-100"
            :disabled="isEmpty"
            @click="check"
          >
            Kiểm tra
          </button>
          <button
            v-else-if="wasCorrect"
            type="button"
            class="btn btn-primary w-100"
            @click="next"
          >
            Tiếp theo
            <span aria-hidden="true">&rarr;</span>
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
  </div>
</template>

<style scoped>
/* Focus panel (§5.3) — shared card surface + entrance animation (§8). */
.type-panel {
  position: relative;
  width: min(640px, 100%);
  padding: 1.5rem 1.25rem 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  animation: type-panel-in 200ms ease-out;
}

@keyframes type-panel-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Corner-pinned shared audio button — same placement as the flashcard. */
.type-speak {
  top: 0.75rem;
  right: 0.75rem;
}

/* Eyebrow: question kind reads as metadata (§3.2). */
.type-eyebrow {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-text-muted);
  margin-bottom: 0.75rem;
}

/* Prompt zone: brand-tinted stage — the flashcard's "alive" card language
   (P7); the prompt is the hero content at the documented scale (§3.2). */
.type-prompt-zone {
  padding: 1.75rem 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background: linear-gradient(
    135deg,
    rgba(var(--app-brand-rgb), 0.07),
    var(--app-surface) 60%
  );
}

.type-prompt {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* IPA and other transcriptions read as data — system monospace (§3.2). */
.is-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
}

/* Input row: result mark sits inside the field. */
.type-input-row {
  position: relative;
  margin-bottom: 0.25rem;
}

.type-input {
  text-align: center;
  font-size: 1.2rem;
  /* Keep typed text clear of the ✓/✗ mark. */
  padding-right: 2.5rem;
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
}

.type-input.is-correct {
  border-color: var(--bs-success);
  background-color: rgba(var(--bs-success-rgb), 0.1);
  color: var(--bs-success);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-success-rgb), 0.15);
}

.type-input.is-wrong {
  border-color: var(--bs-danger);
  background-color: rgba(var(--bs-danger-rgb), 0.1);
  color: var(--bs-danger);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-danger-rgb), 0.15);
}

.type-input-mark {
  position: absolute;
  top: 1.2rem;
  right: 0.9rem;
  font-weight: 800;
  font-size: 1.25rem;
  animation: type-mark-pop 150ms ease-out;
}

.type-input-mark.is-correct {
  color: var(--bs-success);
}

.type-input-mark.is-wrong {
  color: var(--bs-danger);
}

@keyframes type-mark-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.type-enter-hint {
  display: block;
  text-align: center;
  margin-top: 0.5rem;
}

.type-expected {
  overflow-wrap: anywhere;
}

.type-feedback {
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
}

/* P10 / §8.4 — remove non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .type-panel,
  .type-input-mark {
    animation: none;
  }
}
</style>