<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLearningStore, MIN_WORDS_TO_STUDY } from '@/stores/learningStore'
import { useWordsStore } from '@/stores/wordsStore'

const router = useRouter()
const learningStore = useLearningStore()
const wordsStore = useWordsStore()

const words = computed(() =>
  wordsStore.wordsOf(learningStore.selectedCollectionId),
)
const selectedCount = computed(() => learningStore.selectedWordIds.length)
const canProceed = computed(() => learningStore.canProceedToSkills)

// TODO(Phase 3): real checkbox list rows + select-all + sticky CTA.
function proceedToSkills() {
  router.push({ name: 'skill-selection' })
}
</script>

<template>
  <section class="word-selection-view">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h3 mb-0">Chọn từ vựng để học</h1>
      <span class="badge text-bg-primary">
        Đã chọn: {{ selectedCount }} / {{ words.length }}
      </span>
    </div>

    <p class="text-muted">
      Chọn ít nhất {{ MIN_WORDS_TO_STUDY }} từ vựng để tiếp tục.
    </p>

    <div class="text-center text-muted border rounded py-5">
      <p class="mb-0 fs-5">Danh sách từ vựng chọn để học sẽ hiển thị tại đây.</p>
      <p class="small mb-0">(Selection flow — Phase 3)</p>
    </div>

    <!-- Sticky CTA (FR-L02) -->
    <div class="sticky-action-bar text-end">
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
  </section>
</template>