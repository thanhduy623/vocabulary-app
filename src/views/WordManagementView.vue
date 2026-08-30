<script setup>
// Word Management screen (FR-W01..W09): list, search, filter, sort, CRUD.
// All search/filter/sort are client-side (BR-27); data flows cache-first.

import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useWordsStore } from '@/stores/wordsStore'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { useLearningStore } from '@/stores/learningStore'
import { useUiStore } from '@/stores/uiStore'
import { sortByLocale } from '@/lib/text'
import FilterBar from '@/components/words/FilterBar.vue'
import WordRow from '@/components/words/WordRow.vue'
import WordFormModal from '@/components/words/WordFormModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

// Lazy-loaded: wraps the SheetJS dependency (≈230 kB) in a separate chunk
// that is fetched only when the user first opens the bulk-import modal.
const BulkImportModal = defineAsyncComponent(
  () => import('@/components/words/BulkImportModal.vue'),
)

const route = useRoute()
const wordsStore = useWordsStore()
const collectionsStore = useCollectionsStore()
const learningStore = useLearningStore()
const uiStore = useUiStore()

/** Active collection: route param wins (deep-link), else store selection. */
const collectionId = ref('')

/** @type {{search:string,type:string,topic:string,level:string}} */
const filters = ref({ search: '', type: '', topic: '', level: '' })

/** Modal state: null | { type:'create' } | { type:'edit', id } */
const modalState = ref(null)
/** Bulk import modal (Excel template upload). */
const bulkOpen = ref(false)
const modalErrors = ref({})
const busy = ref(false)

const collection = computed(() => collectionsStore.getById(collectionId.value))
const fetchState = computed(
  () => wordsStore.fetchStateByCollection[collectionId.value] || 'idle',
)
/** Real cause of a failed load (e.g. missing index, permissions). */
const fetchError = computed(
  () => wordsStore.fetchErrorByCollection[collectionId.value] || '',
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

onMounted(async () => {
  // Deep-link support: sync store selection from the route param.
  const param = String(route.params.collectionId ?? '')
  if (param && param !== learningStore.selectedCollectionId) {
    learningStore.selectCollection(param)
  }
  collectionId.value = learningStore.selectedCollectionId || param

  await loadWords()
})

async function loadWords() {
  await wordsStore.ensureWords(collectionId.value)
}

// --- modal helpers ---------------------------------------------------------

function openCreate() {
  modalErrors.value = {}
  modalState.value = { type: 'create' }
}

function openBulk() {
  bulkOpen.value = true
}

function closeBulk() {
  bulkOpen.value = false
}

function openEdit(id) {
  modalErrors.value = {}
  modalState.value = { type: 'edit', id }
}

function closeModal() {
  if (!busy.value) {
    modalState.value = null
    modalErrors.value = {}
  }
}

function clearFieldError(field) {
  if (modalErrors.value[field]) {
    const next = { ...modalErrors.value }
    delete next[field]
    modalErrors.value = next
  }
}

async function handleSubmit(payload) {
  busy.value = true
  try {
    // BR-26: new words default to the active collection.
    const values = { ...payload.values }
    if (!payload.id && !values.collectionId) {
      values.collectionId = collectionId.value
    }

    const res = payload.id
      ? await wordsStore.updateWord(payload.id, values)
      : await wordsStore.createWord(values)

    if (!res.ok) {
      modalErrors.value = { ...(res.errors || {}) }
      return
    }

    modalState.value = null
    modalErrors.value = {}
    uiStore.pushToast('success', payload.id ? 'Đã cập nhật từ vựng' : 'Đã thêm từ vựng')
  } finally {
    busy.value = false
  }
}

// --- delete ----------------------------------------------------------------

async function requestDelete(id) {
  const confirmed = await uiStore.confirm({
    title: 'Xóa từ vựng',
    message: 'Bạn có chắc chắn muốn xóa từ vựng này không?',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    danger: true,
  })
  if (!confirmed) return

  busy.value = true
  try {
    const deleted = await wordsStore.deleteWord(collectionId.value, id)
    if (deleted) uiStore.pushToast('success', 'Đã xóa từ vựng')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="word-management-view">
    <!-- Page header (§12): collection name + counts left, single primary CTA
         right. Stacks on phones (§5.1) with a full-width touch target. -->
    <header
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-3 mb-4"
    >
      <div class="min-width-0">
        <h1 class="h3 mb-1 text-truncate">{{ collection?.name || 'Từ vựng' }}</h1>
        <p class="text-muted small mb-0">
          {{ words.length }} từ vựng · hiển thị {{ visibleWords.length }}
        </p>
      </div>
      <div class="d-grid gap-2 d-sm-flex justify-content-sm-end">
        <button type="button" class="btn btn-outline-primary" @click="openBulk">
          Nhập hàng loạt
        </button>
        <button type="button" class="btn btn-primary" @click="openCreate">
          + Thêm từ vựng
        </button>
      </div>
    </header>

    <!-- Loading -->
    <AppSpinner v-if="fetchState === 'loading'" label="Đang tải từ vựng..." />

    <!-- Error -->
    <div
      v-else-if="fetchState === 'error'"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-1 fs-5">Không thể tải danh sách từ vựng.</p>
      <p v-if="fetchError" class="small text-danger mb-0">{{ fetchError }}</p>
      <button type="button" class="btn btn-outline-primary mt-3" @click="loadWords">
        Thử lại
      </button>
    </div>

    <!-- Empty -->
    <div
      v-else-if="words.length === 0"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-0 fs-5">Chưa có từ vựng nào trong bộ sưu tập này.</p>
      <p class="small mb-0">Bấm "+ Thêm từ vựng" để bắt đầu.</p>
    </div>

    <!-- List (client-side search/filter/sort, BR-27) -->
    <template v-else>
      <FilterBar v-model="filters" :options="filterOptions" />

      <div v-if="visibleWords.length === 0" class="text-center text-muted py-4">
        <p class="mb-0">Không có từ vựng nào khớp bộ lọc.</p>
      </div>

      <div v-else class="table-responsive border rounded bg-white">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col">Từ</th>
              <th scope="col">Phiên âm</th>
              <th scope="col">Nghĩa</th>
              <th scope="col" class="d-none d-lg-table-cell">Phân loại</th>
              <th scope="col" class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <WordRow
              v-for="word in visibleWords"
              :key="word.id"
              :word="word"
              :busy="busy"
              @edit="openEdit"
              @delete="requestDelete"
            />
          </tbody>
        </table>
      </div>
    </template>

    <!-- Create/Edit modal -->
    <WordFormModal
      :visible="modalState !== null"
      :word="modalState?.type === 'edit' ? wordsStore.findWordById(modalState.id) : null"
      :busy="busy"
      :errors="modalErrors"
      :options="filterOptions"
      :default-collection-id="collectionId"
      @submit="handleSubmit"
      @close="closeModal"
      @clear-error="clearFieldError"
    />

    <!-- Bulk import modal -->
    <BulkImportModal
      :visible="bulkOpen"
      :default-collection-id="collectionId"
      @close="closeBulk"
    />
  </section>
</template>

<style scoped>
/* State panels (error/empty/filtered-empty) — same surface as Home (§3.3). */
.state-panel {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

/* List surface: hairline border + soft shadow; rounded corners clip the
   table so the header band and last row follow the radius (§7.5). */
.list-panel {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Shrinkable flex children need min-width: 0 for truncation (§3.2). */
.min-width-0 {
  min-width: 0;
}
</style>