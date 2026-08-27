<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { useLearningStore } from '@/stores/learningStore'
import { useUiStore } from '@/stores/uiStore'
import CollectionCard from '@/components/collections/CollectionCard.vue'
import CollectionFormModal from '@/components/collections/CollectionFormModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const router = useRouter()
const collectionsStore = useCollectionsStore()
const learningStore = useLearningStore()
const uiStore = useUiStore()

/** Modal state: null = closed, else { type: 'create' } | { type: 'edit', id } */
const modalState = ref(null)
/** Validation/DB errors from the last submit attempt. */
const modalErrors = ref({})
const busy = ref(false)

onMounted(() => {
  collectionsStore.ensureLoaded()
})

async function loadCollections() {
  await collectionsStore.ensureLoaded()
}

// --- modal helpers -------------------------------------------------------

function openCreate() {
  modalErrors.value = {}
  modalState.value = { type: 'create' }
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
    const res = payload.id
      ? await collectionsStore.updateCollection(payload.id, payload.values)
      : await collectionsStore.createCollection(payload.values)

    if (!res.ok) {
      modalErrors.value = { ...(res.errors || {}) }
      return // keep modal open; show validation/DB errors
    }

    modalState.value = null
    modalErrors.value = {}
    uiStore.pushToast(
      'success',
      payload.id ? 'Đã cập nhật bộ sưu tập' : 'Đã tạo bộ sưu tập',
    )
  } finally {
    busy.value = false
  }
}

// --- delete ---------------------------------------------------------------

async function requestDelete(id) {
  const confirmed = await uiConfirmCascade()
  if (!confirmed) return
  busy.value = true
  try {
    const deleted = await collectionsStore.deleteCollection(id)
    if (deleted) {
      uiStore.pushToast('success', 'Đã xóa bộ sưu tập')
    }
  } finally {
    busy.value = false
  }
}

/** Ask the user to confirm cascade deletion (FR-C04 / requirement §4). */
async function uiConfirmCascade() {
  return uiStore.confirm({
    title: 'Xóa bộ sưu tập',
    message:
      'Xóa bộ sưu tập sẽ đồng thời xóa toàn bộ từ vựng thuộc bộ sưu tập này. Bạn có chắc chắn không?',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    danger: true,
  })
}

// --- navigation -----------------------------------------------------------

function goLearn(id) {
  learningStore.selectCollection(id)
  router.push({ name: 'word-selection' })
}

function goWords(id) {
  learningStore.selectCollection(id)
  router.push({ name: 'word-management', params: { collectionId: id } })
}
</script>

<template>
  <section class="home-view">
    <!-- Page header (§12): h3 count left, the screen's single primary CTA right.
         Stacks on phones (§5.1) so the CTA is a full-width touch target. -->
    <header
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-3 mb-4"
    >
      <div class="min-width-0">
        <h1 class="h3 mb-1">
          {{ collectionsStore.sortedCollections.length }} Bộ sưu tập
        </h1>
        <p class="text-muted small mb-0">
          Chọn một bộ sưu tập để bắt đầu học hoặc quản lý từ vựng.
        </p>
      </div>
      <div class="d-grid d-sm-block">
        <button type="button" class="btn btn-primary" @click="openCreate">
          + Thêm bộ sưu tập
        </button>
      </div>
    </header>

    <!-- Loading (§11.1) -->
    <div v-if="collectionsStore.fetchState === 'loading'">
      <AppSpinner label="Đang tải bộ sưu tập..." />
    </div>

    <!-- Error (§11.2): short message + root cause + retry -->
    <div
      v-else-if="collectionsStore.fetchState === 'error'"
      class="home-state text-center py-5 px-3"
      role="alert"
    >
      <p class="fs-5 mb-1">Không thể tải danh sách bộ sưu tập.</p>
      <p v-if="collectionsStore.fetchError" class="small text-danger mb-0">
        {{ collectionsStore.fetchError }}
      </p>
      <button
        type="button"
        class="btn btn-outline-primary mt-3"
        @click="loadCollections"
      >
        Thử lại
      </button>
    </div>

    <!-- Empty (§11.3): explain + the action that fixes it.
         Outline (not solid) — the header CTA stays the single primary (P8). -->
    <div
      v-else-if="collectionsStore.sortedCollections.length === 0"
      class="home-state text-center py-5 px-3"
    >
      <p class="fs-5 mb-1">Chưa có bộ sưu tập nào.</p>
      <p class="small text-muted mb-3">
        Tạo bộ sưu tập đầu tiên để bắt đầu học từ vựng.
      </p>
      <button type="button" class="btn btn-outline-primary" @click="openCreate">
        + Thêm bộ sưu tập
      </button>
    </div>

    <!-- Grid (§12): row g-3 + col-12 col-sm-6 col-lg-4, A→Z via sortedCollections -->
    <div v-else class="row g-3">
      <div
        v-for="collection in collectionsStore.sortedCollections"
        :key="collection.id"
        class="col-12 col-sm-6 col-lg-4"
      >
        <CollectionCard
          :collection="collection"
          :busy="busy"
          @learn="goLearn"
          @words="goWords"
          @edit="openEdit"
          @delete="requestDelete"
        />
      </div>
    </div>

    <!-- Create/Edit modal -->
    <CollectionFormModal
      :visible="modalState !== null"
      :collection="modalState?.type === 'edit' ? collectionsStore.getById(modalState.id) : null"
      :busy="busy"
      :errors="modalErrors"
      @submit="handleSubmit"
      @close="closeModal"
      @clear-error="clearFieldError"
    />
  </section>
</template>

<style scoped>
/* State panels (error/empty) rest on one surface card (§3.3, §7.9). */
.home-state {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

/* Shrinkable flex children need min-width: 0 for truncation (§3.2). */
.min-width-0 {
  min-width: 0;
}
</style>