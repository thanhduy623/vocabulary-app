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
import AudioPlayButton from '@/components/learning/AudioPlayButton.vue'
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
    glyph: '/ə/',
  },
  {
    id: 'word',
    label: 'Luyện từ',
    description: 'Hiện phiên âm / nghĩa → bạn gõ từ tiếng Anh.',
    glyph: 'Aa',
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
  if (!store.startTypingMode(chosen)) return
  // A (re)started plan always begins fresh — clear any in-flight answer state
  // so the panel never shows stale feedback from the previous mode.
  clearAdvanceTimer()
  typedValue.value = ''
  submittedValue.value = ''
  submitted.value = false
  wasCorrect.value = false
  showDetail.value = false
  mode.value = chosen
}

/** Back to the mode picker (convenience). The plan restarts on re-pick. */
function changeMode() {
  clearAdvanceTimer()
  mode.value = null
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
      <p class="type-eyebrow">Luyện gõ</p>
      <h2 class="h4 text-center mb-4">Bạn muốn gõ gì?</h2>

      <div class="row g-3">
        <div v-for="opt in MODE_OPTIONS" :key="opt.id" class="col-12 col-sm-6">
          <button
            type="button"
            class="card h-100 w-100 border text-start p-3 type-mode-card"
            @click="selectMode(opt.id)"
          >
            <div class="d-flex align-items-center gap-3">
              <span class="type-mode-icon" aria-hidden="true">{{ opt.glyph }}</span>
              <div class="min-w-0">
                <div class="fw-semibold mb-1">{{ opt.label }}</div>
                <div class="small text-muted">{{ opt.description }}</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <p class="text-muted small text-center mt-3 mb-0">
        Bạn có thể đổi chế độ bất cứ lúc nào bằng nút "Đổi chế độ".
      </p>
    </div>

    <!-- QUESTION MODE -->
    <template v-else>
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

        <!-- Targeted input; the floating chip restates what to type -->
        <div class="type-input-row">
          <span class="type-target-chip">Gõ: {{ targetLabelUpper }}</span>
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
            type="button"
            class="btn btn-sm btn-outline-secondary"
            title="Đổi chế độ — tiến trình luyện gõ sẽ bắt đầu lại"
            @click="changeMode"
          >
            Đổi chế độ
          </button>
          <button
            v-if="!submitted"
            type="button"
            class="btn btn-primary"
            :disabled="isEmpty"
            @click="check"
          >
            Kiểm tra
          </button>
          <button
            v-else-if="wasCorrect"
            type="button"
            class="btn btn-primary"
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
    </template>
  </div>
</template>

<style scoped>
.type-picker {
  width: min(560px, 100%);
}

/* Mode cards: same interactive-card language as the skill picker (§7.5). */
.type-mode-card {
  cursor: pointer;
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

/* Hover/focus lift (§3.3 level 2) + brand ring. */
.type-mode-card:hover,
.type-mode-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(var(--app-brand-rgb), 0.45);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 3px rgba(var(--app-brand-rgb), 0.12);
}

/* Brand-gradient tile matching the skill-selection icon language (§7.1). */
.type-mode-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 0.9rem;
  background: linear-gradient(
    135deg,
    var(--app-brand),
    rgba(var(--app-brand-rgb), 0.72)
  );
  color: var(--app-brand-contrast);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 18px rgba(var(--app-brand-rgb), 0.35);
}

/* Shrinkable flex children need min-width: 0 (§3.2). */
.min-w-0 {
  min-width: 0;
}

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

/* Input row: floating target chip + result mark inside the field. */
.type-input-row {
  position: relative;
  margin-bottom: 0.25rem;
}

.type-target-chip {
  position: absolute;
  top: -0.7rem;
  left: 0.75rem;
  z-index: 2;
  padding: 0.1rem 0.5rem;
  border: 1px solid rgba(var(--app-brand-rgb), 0.35);
  border-radius: 0.375rem;
  background-color: rgba(var(--app-brand-rgb), 0.08);
  color: var(--app-brand);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
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
  .type-mode-card,
  .type-mode-card:hover,
  .type-mode-card:focus-visible {
    transform: none;
    transition: none;
  }

  .type-panel,
  .type-input-mark {
    animation: none;
  }
}
</style>