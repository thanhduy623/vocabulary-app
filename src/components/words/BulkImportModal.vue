<script setup>
// Bulk import modal (FR-W05 + template upload).
//
// Flow: download template → upload Excel → validate (shape + required fields)
// → show drafts → bulk create → per-row status. Failed rows are clickable to
// retry that single word. Word persistence goes through wordsStore so the
// cache stays consistent with Firebase (Firebase mutation → cache → UI).

import { ref, computed, watch } from 'vue'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { useWordsStore } from '@/stores/wordsStore'
import { useUiStore } from '@/stores/uiStore'
import { readWorkbookRows } from '@/lib/excel'
import {
  TEMPLATE_COLUMNS,
  TEMPLATE_FILE_NAME,
  STATUS,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  validateRows,
} from '@/services/bulkImport.service'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  /** Active collection (BR-26): preselected target for imported words. */
  defaultCollectionId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'created'])

const collectionsStore = useCollectionsStore()
const wordsStore = useWordsStore()
const uiStore = useUiStore()

const selectedCollectionId = ref('')
const fileName = ref('')
/** @type {import('vue').Ref<Object[]>} validated drafts ({key,row,values,status,error}) */
const items = ref([])
const fileError = ref('')
const rowErrors = ref([])
const parsing = ref(false)
const creating = ref(false)
const fileInput = ref(null)

const templateUrl = `${import.meta.env.BASE_URL}${TEMPLATE_FILE_NAME}`

const createdCount = computed(
  () => items.value.filter((i) => i.status === STATUS.CREATED).length,
)
const failedCount = computed(
  () => items.value.filter((i) => i.status === STATUS.FAILED).length,
)
const pendingCount = computed(
  () => items.value.filter((i) => i.status === STATUS.PENDING).length,
)
const canCreate = computed(
  () => items.value.length > 0 && !creating.value && !parsing.value,
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    reset()
    // The dropdown lists cached collections; make sure they are loaded.
    collectionsStore.ensureLoaded()
  },
)

function reset() {
  selectedCollectionId.value = props.defaultCollectionId || ''
  fileName.value = ''
  items.value = []
  fileError.value = ''
  rowErrors.value = []
  parsing.value = false
  creating.value = false
}

function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(event) {
  const [file] = event.target.files || []
  if (event.target) event.target.value = '' // allow re-uploading the same file
  if (!file) return

  parsing.value = true
  fileName.value = ''
  fileError.value = ''
  rowErrors.value = []
  items.value = []

  try {
    const rawRows = await readWorkbookRows(file)
    const result = validateRows(rawRows)
    if (!result.ok) {
      fileError.value = result.errors?.detail || 'File không đúng với file mẫu.'
      rowErrors.value = result.errors?.rows || []
      return
    }
    fileName.value = file.name
    items.value = result.items
  } catch (error) {
    fileError.value = error?.message || 'Không thể đọc file Excel.'
  } finally {
    parsing.value = false
  }
}

/**
 * Create one draft via the words store. Called by the bulk loop and the
 * per-row retry. The target collection is pinned on the item on first attempt
 * so a retry still writes to the same collection.
 * @param {{values: Object}} item
 * @returns {Promise<boolean>}
 */
async function createItem(item) {
  const targetCollectionId = item.collectionId || selectedCollectionId.value
  if (!targetCollectionId) {
    item.status = STATUS.FAILED
    item.error = 'Chưa chọn bộ sưu tập đích.'
    return false
  }

  item.collectionId = targetCollectionId
  item.status = STATUS.CREATING
  item.error = ''

  const res = await wordsStore.createWordQuiet({
    ...item.values,
    collectionId: targetCollectionId,
  })

  if (res.ok) {
    item.status = STATUS.CREATED
    return true
  }

  item.status = STATUS.FAILED
  item.error = Object.values(res.errors || {}).join(' · ') || 'Tạo từ vựng thất bại.'
  return false
}

async function bulkCreate() {
  if (!canCreate.value) return
  if (!selectedCollectionId.value) {
    uiStore.pushToast('danger', 'Vui lòng chọn bộ sưu tập đích trước khi tạo.')
    return
  }

  creating.value = true
  let created = 0
  try {
    for (const item of items.value) {
      if (item.status === STATUS.CREATED) continue
      const ok = await createItem(item)
      if (ok) created += 1
    }
  } finally {
    creating.value = false
  }

  if (created > 0) {
    uiStore.pushToast('success', `Đã tạo ${created} từ vựng.`)
    emit('created', { count: created })
  }
  if (items.value.some((i) => i.status === STATUS.FAILED)) {
    uiStore.pushToast(
      'warning',
      `${failedCount.value} từ vựng tạo thất bại. Bấm vào dòng thất bại để thử lại.`,
      { duration: 5000 },
    )
  }
}

async function retryItem(item) {
  if (creating.value || item.status !== STATUS.FAILED) return
  const ok = await createItem(item)
  uiStore.pushToast(
    ok ? 'success' : 'danger',
    ok
      ? `Đã tạo "${item.values.word}"`
      : `"${item.values.word}" vẫn thất bại: ${item.error}`,
  )
}

/** Whole failed rows are clickable to retry that single word (requirement). */
function onRowClick(item) {
  if (creating.value || item.status !== STATUS.FAILED) return
  retryItem(item)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Thêm từ vựng hàng loạt</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              :disabled="creating"
              @click="emit('close')"
            />
          </div>

          <div class="modal-body">
            <div class="row g-3 mb-3 align-items-end">
              <div class="col-12 col-md-6">
                <label for="bulk-collection" class="form-label">Bộ sưu tập đích *</label>
                <select
                  id="bulk-collection"
                  v-model="selectedCollectionId"
                  class="form-select"
                  :disabled="creating || parsing"
                >
                  <option value="" disabled>-- Chọn bộ sưu tập --</option>
                  <option
                    v-for="collection in collectionsStore.sortedCollections"
                    :key="collection.id"
                    :value="collection.id"
                  >
                    {{ collection.name }}
                  </option>
                </select>
              </div>

              <div class="col-4 col-md-3">
                <a
                  class="btn btn-outline-secondary w-100"
                  :href="templateUrl"
                  :download="TEMPLATE_FILE_NAME"
                >
                  <svg
                    class="bulk-btn-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M8 2v8m0 0 3-3m-3 3L5 7" />
                    <path d="M2.5 12.5v1h11v-1" />
                  </svg>
                  Download file
                </a>
              </div>

              <div class="col-4 col-md-3">
                <button
                  type="button"
                  class="btn btn-outline-primary w-100"
                  :disabled="creating || parsing"
                  @click="pickFile"
                >
                  <svg
                    class="bulk-btn-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M8 10V2m0 0 3 3M8 2 5 5" />
                    <path d="M2.5 12.5v1h11v-1" />
                  </svg>
                  Upload file
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  class="d-none"
                  accept=".xlsx,.xls"
                  @change="onFileSelected"
                />
              </div>
            </div>

            <p class="small text-muted mb-3">
              Tải file mẫu để xem đúng cấu trúc: {{ TEMPLATE_COLUMNS.length }}
              cột <code class="bulk-code">{{ TEMPLATE_COLUMNS.join(' → ') }}</code>,
              dữ liệu từ vựng bắt đầu từ hàng 2.
            </p>

            <p class="small mb-0" :class="fileName ? 'text-success' : 'text-muted'">
              {{ fileName ? `Đã chọn: ${fileName}` : 'Chưa chọn file Excel.' }}
            </p>

            <div
              v-if="parsing"
              class="d-flex align-items-center gap-2 text-muted small my-3"
              role="status"
              aria-live="polite"
            >
              <span class="spinner-border spinner-border-sm" aria-hidden="true" />
              Đang đọc và kiểm tra file...
            </div>

            <!-- File-level error (template mismatch) -->
            <div v-if="fileError" class="alert alert-danger py-2 mt-3 mb-0">
              {{ fileError }}
            </div>

            <!-- Row-level validation errors -->
            <div v-if="rowErrors.length" class="alert alert-warning py-2 mt-3 mb-0">
              <p class="fw-semibold mb-1">File có lỗi dữ liệu — kiểm tra lại:</p>
              <ul class="small mb-0 ps-3">
                <li v-for="error in rowErrors" :key="error.row">
                  Dòng {{ error.row }}: {{ error.messages.join('; ') }}
                </li>
              </ul>
            </div>

            <!-- Uploaded word list (7 template columns + Status) -->
            <div v-if="items.length" class="table-responsive border rounded bg-white mt-3">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="text-muted">Dòng</th>
                    <th scope="col">Từ</th>
                    <th scope="col">Phiên âm</th>
                    <th scope="col">Nghĩa</th>
                    <th scope="col">Ví dụ</th>
                    <th scope="col">Loại từ</th>
                    <th scope="col">Chủ đề</th>
                    <th scope="col">Cấp độ</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in items"
                    :key="item.key"
                    :class="{ 'bulk-failed-row': item.status === STATUS.FAILED && !creating }"
                    :title="item.status === STATUS.FAILED && !creating ? 'Bấm để thử lại từ này' : ''"
                    @click="onRowClick(item)"
                  >
                    <td class="text-muted small text-nowrap">{{ item.row }}</td>
                    <td class="fw-semibold text-nowrap">{{ item.values.word }}</td>
                    <td class="bulk-transcription">{{ item.values.transcription }}</td>
                    <td class="bulk-wrap">{{ item.values.meaning }}</td>
                    <td class="bulk-wrap text-muted">{{ item.values.example }}</td>
                    <td class="text-nowrap">{{ item.values.type }}</td>
                    <td class="text-nowrap">{{ item.values.topic }}</td>
                    <td class="text-nowrap">{{ item.values.level }}</td>
                    <td class="text-nowrap">
                      <span class="badge" :class="STATUS_BADGE_CLASSES[item.status]">
                        {{ STATUS_LABELS[item.status] }}
                      </span>
                      <button
                        v-if="item.status === STATUS.FAILED && !creating"
                        type="button"
                        class="btn btn-link btn-sm p-0 ms-1 align-baseline"
                        @click.stop="retryItem(item)"
                      >
                        Thử lại
                      </button>
                      <span
                        v-if="item.status === STATUS.FAILED && item.error"
                        class="d-block small text-danger"
                      >
                        {{ item.error }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="items.length"
              class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 small text-muted"
            >
              <span>
                {{ items.length }} dòng · {{ createdCount }} đã tạo ·
                {{ failedCount }} thất bại · {{ pendingCount }} chưa tạo
              </span>
              <span v-if="failedCount" class="text-danger">
                Bấm vào dòng thất bại để thử lại từ đó.
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="creating"
              @click="emit('close')"
            >
              Đóng
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!canCreate"
              @click="bulkCreate"
            >
              <span
                v-if="creating"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              />
              {{ creating ? 'Đang tạo...' : 'Tạo hàng loạt' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="visible" class="modal-backdrop fade show" aria-hidden="true" />
  </Teleport>
</template>

<style scoped>
/* Clickable failed rows: red-tinted surface + pointer so "click to retry"
   is discoverable on touch and desktop (requirement). */
.bulk-failed-row {
  cursor: pointer;
  background-color: rgba(220, 53, 69, 0.06);
}
.bulk-failed-row:hover {
  background-color: rgba(220, 53, 69, 0.14);
}

/* Phonetics read as data — system monospace (matches WordRow). */
.bulk-transcription {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
  font-size: 0.8125rem;
}

/* Long meaning/example values wrap safely inside the scrollable modal. */
.bulk-wrap {
  min-width: 8rem;
  overflow-wrap: anywhere;
}

/* Column order hint. */
.bulk-code {
  font-size: inherit;
}

/* Small inline icons on the download/upload buttons. */
.bulk-btn-icon {
  width: 1em;
  height: 1em;
  margin-right: 0.35em;
  vertical-align: -0.125em;
}
</style>