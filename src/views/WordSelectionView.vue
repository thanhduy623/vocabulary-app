<script setup>
// Word Selection screen (FR-L01..L03, BR-31/32/34).
// Checkbox rows + Select All; selection persists per collection; sticky CTA
// enabled at >= MIN_WORDS_TO_STUDY (4).

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLearningStore, MIN_WORDS_TO_STUDY } from '@/stores/learningStore'
import { useWordsStore } from '@/stores/wordsStore'
import { useCollectionsStore } from '@/stores/collectionsStore'
import AppSpinner from '@/components/common/AppSpinner.vue'

const router = useRouter()
const learningStore = useLearningStore()
const wordsStore = useWordsStore()
const collectionsStore = useCollectionsStore()

const collectionId = ref(learningStore.selectedCollectionId ?? '')

const collection = computed(() =>
  collectionsStore.getById(collectionId.value),
)
const fetchState = computed(
  () => wordsStore.fetchStateByCollection[collectionId.value] || 'idle',
)
const words = computed(() => wordsStore.wordsOf(collectionId.value))

const selectedCount = computed(() => learningStore.selectedWordIds.length)
const canProceed = computed(() => learningStore.canProceedToSkills)
/** BR-32: a collection with < 4 words can never satisfy the gate. */
const collectionTooSmall = computed(
  () => words.value.length > 0 && words.value.length < MIN_WORDS_TO_STUDY,
)

const allSelected = computed(
  () =>
    words.value.length > 0 &&
    words.value.every((w) => learningStore.selectedWordIds.includes(w.id)),
)

function isSelected(wordId) {
  return learningStore.selectedWordIds.includes(wordId)
}

function proceedToSkills() {
  if (!canProceed.value) return
  router.push({ name: 'skill-selection' })
}

onMounted(() => {
  if (collectionId.value) {
    wordsStore.ensureWords(collectionId.value)
  }
})
</script>

<template>
  <section class="word-selection-view">
    <div class="d-flex align-items-center justify-content-between mb-1">
      <h1 class="h3 mb-0">Chọn từ vựng để học</h1>
      <span class="badge text-bg-primary fs-6">
        Đã chọn: {{ selectedCount }} / {{ words.length }}
      </span>
    </div>
    <p class="text-muted small mb-3">
      Bộ sưu tập: <strong>{{ collection?.name || '—' }}</strong>
      · chọn ít nhất {{ MIN_WORDS_TO_STUDY }} từ để tiếp tục.
    </p>

    <!-- Loading -->
    <AppSpinner v-if="fetchState === 'loading'" label="Đang tải từ vựng..." />

    <!-- Error -->
    <div
      v-else-if="fetchState === 'error'"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-0 fs-5">Không thể tải danh sách từ vựng.</p>
      <button
        type="button"
        class="btn btn-outline-primary mt-3"
        @click="wordsStore.ensureWords(collectionId)"
      >
        Thử lại
      </button>
    </div>

    <!-- Empty -->
    <div
      v-else-if="words.length === 0"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-0 fs-5">Bộ sưu tập chưa có từ vựng.</p>
      <p class="small mb-0">Hãy thêm từ vựng trước khi học.</p>
    </div>

    <!-- Checkbox list (FR-L02) -->
    <template v-else>
      <div class="form-check ms-1 mb-2">
        <input
          id="select-all"
          type="checkbox"
          class="form-check-input"
          :checked="allSelected"
          @change="learningStore.toggleAllWords(words)"
        />
        <label class="form-check-label fw-semibold" for="select-all">
          Chọn tất cả
        </label>
      </div>

      <div class="list-group border rounded bg-white mb-3">
        <label
          v-for="word in words"
          :key="word.id"
          class="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2"
        >
          <input
            type="checkbox"
            class="form-check-input m-0"
            :checked="isSelected(word.id)"
            @change="learningStore.toggleWord(word.id)"
          />
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold text-truncate">{{ word.word }}</div>
            <div class="small text-muted text-truncate">
              {{ word.transcription }} — {{ word.meaning }}
            </div>
          </div>
          <span v-if="word.type" class="badge text-bg-light">{{ word.type }}</span>
          <span v-if="word.level" class="badge text-bg-secondary">{{ word.level }}</span>
        </label>
      </div>

      <p v-if="collectionTooSmall" class="text-warning small">
        Bộ sưu tập cần tối thiểu {{ MIN_WORDS_TO_STUDY }} từ vựng để học. Hãy thêm
        thêm {{ MIN_WORDS_TO_STUDY - words.length }} từ nữa.
      </p>

      <!-- Sticky CTA (FR-L02) -->
      <div class="sticky-action-bar d-flex align-items-center justify-content-between">
        <span class="small text-muted">Đã chọn: {{ selectedCount }} từ</span>
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="!canProceed"
          @click="proceedToSkills"
        >
          Tiếp
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </template>
  </section>
</template>