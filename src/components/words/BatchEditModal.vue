<script setup>
// Batch edit modal (FR-W06 extension).
//
// Edits a group of selected words at once. Only the four allowed batch fields
// are editable: Collection, Type, Topic, Level. word / transcription /
// meaning / example are intentionally NOT shown (requirement). Fields left
// blank in Type/Topic/Level keep each word's current value — the submit button
// stays disabled until at least one real change exists (no-op guard).

import { reactive, computed, watch } from 'vue'
import { useCollectionsStore } from '@/stores/collectionsStore'
import ComboBoxField from '@/components/words/ComboBoxField.vue'
import { hasBatchChanges } from '@/services/batchEdit.service'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  /** Snapshot (copies) of the words the edit will be applied to. */
  selectedWords: {
    type: Array,
    default: () => [],
  },
  /** Combobox suggestions derived from cached words (FR-W08). */
  options: {
    type: Object,
    required: true,
    // { type: string[], topic: string[], level: string[] }
  },
  /** Current page collection — prefill for the target select (BR-26). */
  defaultCollectionId: {
    type: String,
    default: '',
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'close'])

const collectionsStore = useCollectionsStore()

const form = reactive({
  collectionId: '',
  type: '',
  topic: '',
  level: '',
})

/** Normalized batch payload (trimmed). */
const batch = computed(() => ({
  collectionId: form.collectionId.trim(),
  type: form.type.trim(),
  topic: form.topic.trim(),
  level: form.level.trim(),
}))

const hasChanges = computed(() =>
  hasBatchChanges(batch.value, props.selectedWords),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.collectionId = props.defaultCollectionId || ''
    form.type = ''
    form.topic = ''
    form.level = ''
  },
)

function submit() {
  if (!hasChanges.value || props.busy) return
  emit('submit', { ...batch.value })
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
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <form class="modal-content" novalidate @submit.prevent="submit">
          <div class="modal-header">
            <h5 class="modal-title">Chỉnh sửa hàng loạt</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              :disabled="busy"
              @click="emit('close')"
            />
          </div>

          <div class="modal-body">
            <p class="small text-muted mb-3">
              Áp dụng cho <strong>{{ selectedWords.length }}</strong> từ đã chọn.
              Chỉ các trường bên dưới được sửa hàng loạt; từ vựng, phiên âm,
              nghĩa và ví dụ được giữ nguyên.
            </p>

            <div class="row">
              <div class="col-12 col-md-6 mb-3">
                <label for="batch-collection" class="form-label">Bộ sưu tập</label>
                <select
                  id="batch-collection"
                  v-model="form.collectionId"
                  class="form-select"
                  :disabled="busy"
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
                <div class="form-text">
                  Mặc định là bộ sưu tập hiện tại; đổi bộ sưu tập sẽ di chuyển các
                  từ đã chọn sang bộ mới.
                </div>
              </div>

              <div class="col-12">
                <!-- FR-W08: dropdown of existing values + free typing -->
                <ComboBoxField
                  id="batch-type"
                  label="Loại từ (type)"
                  :model-value="form.type"
                  :options="options.type"
                  placeholder="VD: noun, verb, adjective…"
                  hint="Để trống để giữ nguyên giá trị hiện tại của từ."
                  @update:model-value="(v) => (form.type = v)"
                />
              </div>

              <div class="col-12">
                <ComboBoxField
                  id="batch-topic"
                  label="Chủ đề (topic)"
                  :model-value="form.topic"
                  :options="options.topic"
                  placeholder="VD: Family, Travel, Food…"
                  hint="Để trống để giữ nguyên giá trị hiện tại của từ."
                  @update:model-value="(v) => (form.topic = v)"
                />
              </div>

              <div class="col-12">
                <ComboBoxField
                  id="batch-level"
                  label="Cấp độ (level)"
                  :model-value="form.level"
                  :options="options.level"
                  placeholder="VD: A1, A2, B1…"
                  hint="Để trống để giữ nguyên giá trị hiện tại của từ."
                  @update:model-value="(v) => (form.level = v)"
                />
              </div>
            </div>

            <div v-if="!hasChanges" class="text-muted small">
              Chưa có thay đổi nào — điều chỉnh bộ sưu tập hoặc nhập một giá trị ở
              trên để tiếp tục.
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="busy"
              @click="emit('close')"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="busy || !hasChanges"
            >
              <span
                v-if="busy"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              />
              {{ busy ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <div v-if="visible" class="modal-backdrop fade show" aria-hidden="true" />
  </Teleport>
</template>