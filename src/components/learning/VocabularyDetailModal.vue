<script setup>
// Vocabulary detail modal — shown after a WRONG answer in Multiple-Choice /
// Listening. Displays full details of the vocabulary item so the learner can
// study it before continuing. The caller commits the (wrong) answer to the
// engine ONLY when the learner clicks "Đã học", so the item is re-queued
// randomly later instead of being counted as learned.

import { computed } from 'vue'

const props = defineProps({
  /** Full word object from the session snapshot (may be null). */
  word: {
    type: Object,
    default: null,
  },
  /** Whether the chosen answer was correct (drives the accent color/icon). */
  wasCorrect: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['learned'])

/** The actual button handler — appears in template as `confirm`. */
function confirmLearned() {
  emit('learned')
}

const detailRows = computed(() =>
  [
    { field: 'word', label: 'Từ', value: props.word?.word, icon: '🔤' },
    {
      field: 'transcription',
      label: 'Phiên âm',
      value: props.word?.transcription,
      icon: '🔊',
    },
    { field: 'meaning', label: 'Nghĩa', value: props.word?.meaning, icon: '📖' },
    { field: 'example', label: 'Ví dụ', value: props.word?.example, icon: '💬' },
  ].filter((row) => row.value),
)
</script>

<template>
  <Teleport to="body">
    <div class="vocab-detail-backdrop" role="dialog" aria-modal="true" aria-label="Chi tiết từ vựng">
      <div class="vocab-detail-card">
        <div class="vocab-detail-header" :class="wasCorrect ? 'is-correct' : 'is-wrong'">
          <span class="text-uppercase">{{ wasCorrect ? 'Chính xác!' : 'Chưa đúng' }}</span>
        </div>

        <div class="vocab-detail-body">
          <!-- Word + transcription -->
          <div class="text-center mb-3">
            <div class="vocab-word">{{ word?.word || '—' }}</div>
            <div v-if="word?.transcription" class="vocab-transcription">
              {{ word.transcription }}
            </div>
          </div>

          <!-- Detail rows -->
          <div class="vocab-rows">
            <div v-for="row in detailRows" :key="row.field" class="vocab-row">
              <span class="vocab-row-icon">{{ row.icon }}</span>
              <span class="vocab-row-label">{{ row.label }}:</span>
              <span class="vocab-row-value">{{ row.value }}</span>
            </div>
          </div>

          <!-- Badges -->
          <!-- <div v-if="word?.type || word?.topic || word?.level" class="text-center mb-3">
            <span v-if="word.type" class="badge text-bg-light me-1">{{ word.type }}</span>
            <span v-if="word.topic" class="badge text-bg-light me-1">{{ word.topic }}</span>
            <span v-if="word.level" class="badge text-bg-secondary">{{ word.level }}</span>
          </div> -->
        </div>

        <!-- "Đã học" — only this button advances; nothing auto-advances on a wrong answer -->
        <div class="vocab-detail-footer">
          <button
            type="button"
            class="btn btn-warning w-100 learn-btn"
            @click="confirmLearned"
          >
            Học lại
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vocab-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.vocab-detail-card {
  width: min(420px, 100%);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: var(--bs-body-bg, #fff);
  border-radius: 0.9rem;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
}

.vocab-detail-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  border-radius: 0.9rem 0.9rem 0 0;
}
.vocab-detail-header.is-correct {
  background-color: var(--bs-success);
}
.vocab-detail-header.is-wrong {
  background-color: var(--bs-danger);
}

.vocab-detail-body {
  padding: 1.25rem 1.25rem 0.75rem;
}

.vocab-word {
  font-size: 1.6rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.vocab-transcription {
  color: var(--bs-secondary);
  font-size: 1.05rem;
}

.vocab-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.vocab-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.vocab-row-icon {
  flex: 0 0 auto;
}

.vocab-row-label {
  flex: 0 0 auto;
  color: var(--bs-secondary);
  font-weight: 600;
  min-width: 4.2rem;
}

.vocab-row-value {
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.vocab-detail-footer {
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--bs-border-color);
}

.vocab-detail-footer .learn-btn {
  min-height: 48px;
  font-size: 1.1rem;
}
</style>