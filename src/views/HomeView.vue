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
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h1 class="h3 mb-1">{{ collectionsStore.sortedCollections.length || 0 }} Bộ sưu tập</h1>
        <p class="text-muted mb-0">Chọn một bộ sưu tập để bắt đầu học hoặc quản lý từ vựng.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="openCreate">
        + Thêm bộ sưu tập
      </button>
    </div>

    <!-- Loading -->
    <div v-if="collectionsStore.fetchState === 'loading'" class="py-5">
      <AppSpinner label="Đang tải bộ sưu tập..." />
    </div>

    <!-- Error -->
    <div
      v-else-if="collectionsStore.fetchState === 'error'"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-0 fs-5">Không thể tải danh sách bộ sưu tập.</p>
      <button type="button" class="btn btn-outline-primary mt-3" @click="loadCollections">
        Thử lại
      </button>
    </div>

    <!-- Empty -->
    <div
      v-else-if="collectionsStore.sortedCollections.length === 0"
      class="text-center text-muted border rounded py-5"
    >
      <p class="mb-0 fs-5">Chưa có bộ sưu tập nào.</p>
      <p class="small mb-0">Bấm "+ Thêm bộ sưu tập" để bắt đầu.</p>
    </div>

    <!-- Grid (A→Z via sortedCollections getter) -->
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