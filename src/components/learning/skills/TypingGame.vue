<script setup>
// TYPING game (FR-L09, BR-50..52, requirement §2.4.4).
//
// UI responsibilities only — item generation and all session rules (queue,
// retry re-insertion, progress, completion) live in the engine via
// learningStore. Feedback correctness is evaluated with the SAME engine
// evaluate() the session uses, so the UI shows green/red without duplicating
// the normalization logic (BR-50 / AMB-13).
//   - the header always shows WHAT to type (TỪ / PHIÊN ÂM / NGHĨA)
//   - type the answer into the input; Enter or "Kiểm tra" checks
//   - correct → green, wrong → red + reveal the correct answer
//   - after answering the input is locked (cannot retry immediately);
//     Enter again (or "Tiếp theo") advances
//   - "Tiếp theo" commits to the engine: wrong items are re-queued randomly
//     later, so completion requires every item to be answered correctly
//   - 3 templates: word→transcription, transcription→word, meaning→word

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@/stores/learningStore'
import { getSkill } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'

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

// Reset the input + answer state whenever the question changes.
watch(
  () => item.value?.id,
  async () => {
    typedValue.value = ''
    submittedValue.value = ''
    submitted.value = false
    wasCorrect.value = false
    await nextTick()
    inputEl.value?.focus()
  },
  { immediate: true },
)

/** Submit the typed answer: lock the input and show green/red feedback. */
function check() {
  if (!item.value || submitted.value || isEmpty.value) return
  submittedValue.value = typedValue.value
  wasCorrect.value = evaluateTyped()
  submitted.value = true
}

/** Commit the submitted answer to the engine and move on. */
function next() {
  if (!item.value || !submitted.value) return
  store.answerActive({ value: submittedValue.value })
  submitted.value = false
  wasCorrect.value = false
  if (store.isSkillCompletedNow) emit('completed')
}

/** Enter on the input: check the answer while it's still editable. */
function onInputEnter() {
  if (!submitted.value) check()
}

/**
 * Global Enter after answering → immediately advance (the input is disabled so
 * focus has left it). Skips interactive controls so their native Enter
 * activation isn't double-fired.
 */
function onGlobalKeydown(event) {
  if (event.key !== 'Enter' || !item.value || !submitted.value) return
  const tag = event.target?.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  event.preventDefault()
  next()
}

onMounted(() => {
  inputEl.value?.focus()
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

// Notify parent immediately when this skill is already finished.
if (store.isSkillCompletedNow) emit('completed')
</script>

<template>
  <div class="typing-game">
    <ProgressStats v-if="progress" :progress="progress" />

    <div v-if="item" class="type-panel mx-auto my-1">
      <!-- Question type → answer type hint ("what will I type?") -->
      <div class="type-head" role="group" aria-label="Loại câu hỏi">
        <span class="badge type-badge-key">{{ questionLabel }}</span>
        <span class="type-arrow" aria-hidden="true">→</span>
        <span class="badge type-badge-answer">Gõ: {{ targetLabelUpper }}</span>
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
        <template v-if="wasCorrect">Chính xác ✓</template>
        <template v-else>
          Sai rồi — {{ targetLabel }} đúng:
          <span class="fw-semibold">{{ item.payload.expected }}</span>
        </template>
      </div>

      <!-- Actions -->
      <div class="d-flex justify-content-between align-items-center mt-3 type-actions">
        <small class="text-muted">Enter để kiểm tra → Enter để tiếp theo</small>
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
          v-else
          type="button"
          class="btn btn-primary"
          @click="next"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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