<script setup>
// Word Selection screen (FR-L01..L03, BR-31/32/34).
// Checkbox rows + Select All; selection persists per collection; sticky CTA
// enabled at >= MIN_WORDS_TO_STUDY (4).
// Search/filter (type/topic/level) are client-side, reusing the same
// FilterBar + dedup-options pattern as Word Management (BR-27 / FR-W02..03).

import { ref, computed, onMounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/router/routes'
import { useLearningStore, MIN_WORDS_TO_STUDY } from '@/stores/learningStore'
import { useWordsStore } from '@/stores/wordsStore'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { sortByLocale } from '@/lib/text'
import FilterBar from '@/components/words/FilterBar.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const router = useRouter()
const learningStore = useLearningStore()
const wordsStore = useWordsStore()
const collectionsStore = useCollectionsStore()

const collectionId = ref(learningStore.selectedCollectionId ?? '')

/** @type {{search:string,type:string,topic:string,level:string}} */
const filters = ref({ search: '', type: '', topic: '', level: '' })

const collection = computed(() =>
  collectionsStore.getById(collectionId.value),
)
const fetchState = computed(
  () => wordsStore.fetchStateByCollection[collectionId.value] || 'idle',
)
const words = computed(() => wordsStore.wordsOf(collectionId.value))

// FR-W03: dedup options derived from this collection's cached words.
const filterOptions = computed(() =>
  wordsStore.filterOptions(collectionId.value),
)

// BR-27 / FR-W04: client-side search → filter → sort (word A→Z).
const visibleWords = computed(() => {
  const { search, type, topic, level } = filters.value
  const q = search.trim().toLocaleLowerCase('en-US')

  const filtered = words.value.filter((w) => {
    if (q && !String(w.word || '').toLocaleLowerCase('en-US').includes(q)) return false
    if (type && w.type !== type) return false
    if (topic && w.topic !== topic) return false
    if (level && w.level !== level) return false
    return true
  })

  return sortByLocale(filtered, (w) => w.word)
})

const selectedCount = computed(() => learningStore.selectedWordIds.length)
const canProceed = computed(() => learningStore.canProceedToSkills)
/** BR-32: a collection with < 4 words can never satisfy the gate. */
const collectionTooSmall = computed(
  () => words.value.length > 0 && words.value.length < MIN_WORDS_TO_STUDY,
)

/** "Chọn tất cả" reflects the VISIBLE (filtered) set, not the whole bucket. */
const allVisibleSelected = computed(
  () =>
    visibleWords.value.length > 0 &&
    visibleWords.value.every((w) => learningStore.selectedWordIds.includes(w.id)),
)

function isSelected(wordId) {
  return learningStore.selectedWordIds.includes(wordId)
}

function toggleAllVisible() {
  learningStore.toggleAllWords(visibleWords.value)
}

function proceedToSkills() {
  if (!canProceed.value) return
  router.push({ name: ROUTE_NAMES.skillSelection })
}

/**
 * BR-72 (requirements §20): Word Selection → Home resets the whole learning
 * context. Fires for the header Back, the logo, or browser Back, so the guard
 * is the single source of truth. Every other transition is preserved:
 * TIẾP keeps words/collection; word-management keeps the collection.
 */
onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAMES.home) {
    learningStore.resetLearningContext()
  }
})

onMounted(() => {
  if (collectionId.value) {
    wordsStore.ensureWords(collectionId.value)
  }
})
</script>

<template>
  <section class="word-selection-view">
    <!-- Page header (§12): title + counts left, selection status badge right.
         Same anatomy as Word Management for a consistent flow. -->
    <header
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-2 mb-1"
    >
      <div class="min-width-0">
        <h1 class="h3 mb-1">Chọn từ vựng để học</h1>
        <p class="text-muted small mb-0">
          {{ collection?.name || '—' }} · {{ words.length }} từ vựng
          <template v-if="words.length !== visibleWords.length">
            · hiển thị {{ visibleWords.length }}
          </template>
        </p>
      </div>
      <span class="badge text-bg-primary fs-6 px-3 py-2 align-self-start align-self-sm-center">
        Đã chọn: {{ selectedCount }}
      </span>
    </header>
    <p class="text-muted small mb-3">
      Chọn ít nhất {{ MIN_WORDS_TO_STUDY }} từ để tiếp tục.
    </p>

    <!-- Loading (§11.1) -->
    <AppSpinner v-if="fetchState === 'loading'" label="Đang tải từ vựng..." />

    <!-- Error (§11.2): short message + retry -->
    <div
      v-else-if="fetchState === 'error'"
      class="state-panel text-center py-5 px-3"
      role="alert"
    >
      <p class="fs-5 mb-1">Không thể tải danh sách từ vựng.</p>
      <button
        type="button"
        class="btn btn-outline-primary mt-3"
        @click="wordsStore.ensureWords(collectionId)"
      >
        Thử lại
      </button>
    </div>

    <!-- Empty (§11.3) -->
    <div v-else-if="words.length === 0" class="state-panel text-center py-5 px-3">
      <p class="fs-5 mb-1">Bộ sưu tập chưa có từ vựng.</p>
      <p class="small text-muted mb-0">Hãy thêm từ vựng trước khi học.</p>
    </div>

    <!-- Checkbox list: Word · Pronunciation · Meaning · Category (+ pick) -->
    <template v-else>
      <!-- Client-side search + type/topic/level filters (BR-27) -->
      <FilterBar v-model="filters" :options="filterOptions" />

      <!-- Filtered-empty (§11.5) -->
      <div v-if="visibleWords.length === 0" class="state-panel text-center text-muted py-4 px-3">
        <p class="mb-0">Không có từ vựng nào khớp bộ lọc.</p>
      </div>

      <template v-else>
        <!-- Select-all toolbar -->
        <div class="d-flex align-items-center mb-2">
          <div class="form-check m-0">
            <input
              id="select-all"
              type="checkbox"
              class="form-check-input select-checkbox"
              :checked="allVisibleSelected"
              @change="toggleAllVisible"
            />
            <label class="form-check-label fw-semibold" for="select-all">
              Chọn tất cả
              <template v-if="visibleWords.length !== words.length">
                (hiển thị)
              </template>
            </label>
          </div>
        </div>

        <div class="list-panel list-group list-group-flush mb-3">
          <label
            v-for="word in visibleWords"
            :key="word.id"
            class="list-group-item list-group-item-action word-select-row d-flex align-items-center gap-3"
          >
            <input
              type="checkbox"
              class="form-check-input m-0 flex-shrink-0 select-checkbox"
              :checked="isSelected(word.id)"
              @change="learningStore.toggleWord(word.id)"
            />
            <div class="flex-grow-1 min-w-0">
              <div class="fw-semibold text-truncate">{{ word.word }}</div>
              <div class="small text-muted text-truncate">
                <span class="word-transcription">{{ word.transcription }}</span>
                <template v-if="word.transcription && word.meaning"> — </template>
                <span>{{ word.meaning }}</span>
              </div>
            </div>
            <div class="word-category d-flex flex-wrap justify-content-end gap-1 flex-shrink-0">
              <span v-if="word.type" class="badge text-bg-light">{{ word.type }}</span>
              <span v-if="word.topic" class="badge text-bg-light">{{ word.topic }}</span>
              <span v-if="word.level" class="badge text-bg-secondary">{{ word.level }}</span>
            </div>
          </label>
        </div>

        <p v-if="collectionTooSmall" class="text-warning small">
          Bộ sưu tập cần tối thiểu {{ MIN_WORDS_TO_STUDY }} từ vựng để học. Hãy thêm
          thêm {{ MIN_WORDS_TO_STUDY - words.length }} từ nữa.
        </p>

        <!-- Sticky CTA (FR-L02) -->
        <div class="sticky-action-bar d-flex align-items-center justify-content-between gap-3">
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
    </template>
  </section>
</template>

<style scoped>
/* State panels (error/empty/filtered-empty) — same surface as the other
   pages (§3.3, §7.9). */
.state-panel {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

/* List surface — identical to Word Management for flow consistency (§7.5). */
.list-panel {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Flush rows separated by hairlines, not heavy borders (§3.3). */
.list-panel .list-group-item {
  border-color: var(--app-border);
}

/* Larger checkbox = easier touch target inside the row (§10). */
.select-checkbox {
  width: 1.25rem;
  height: 1.25rem;
}

/* Pronunciation reads as data — system monospace, same as the table (§3.2). */
.word-transcription {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
}

/* Shrinkable flex children need min-width: 0 for truncation (§3.2). */
.min-w-0,
.min-width-0 {
  min-width: 0;
}
</style>