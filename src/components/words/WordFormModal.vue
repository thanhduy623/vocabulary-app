<script setup>
// Create/Edit word modal (FR-W05, FR-W06).
// - type/topic/level use ComboBoxField: dropdown of existing values + free typing (FR-W08)
// - collectionId selectable from cached collections; defaults to the active one (BR-26)
// - id/createdAt are never editable (BR-2)

import { reactive, computed, watch } from 'vue'
import { useCollectionsStore } from '@/stores/collectionsStore'
import ComboBoxField from '@/components/words/ComboBoxField.vue'

const props = defineProps({
  /** Existing word when editing; null when creating. */
  word: {
    type: Object,
    default: null,
  },
  visible: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  /** Field errors keyed by field name, plus `_` for general errors. */
  errors: {
    type: Object,
    default: () => ({}),
  },
  /** Combobox options per taxonomy field (deduped from the collection). */
  options: {
    type: Object,
    required: true,
    // { type: string[], topic: string[], level: string[] }
  },
   /** Active collection (BR-26): preselected when creating a new word. */
   defaultCollectionId: {
     type: String,
     default: '',
   },
})

const emit = defineEmits(['submit', 'close', 'clear-error'])

const collectionsStore = useCollectionsStore()

const form = reactive({
  collectionId: '',
  word: '',
  transcription: '',
  meaning: '',
  example: '',
  type: '',
  topic: '',
  level: '',
})

const isEditing = computed(() => Boolean(props.word))

watch(
  () => props.visible,
  (visible) => {
    if (visible) reset()
  },
)

function reset() {
  // BR-26: on create, collectionId defaults to the active collection
  // (`defaultCollectionId`); on edit it stays the word's own collection.
  form.collectionId = props.word?.collectionId ?? props.defaultCollectionId
  form.word = props.word?.word ?? ''
  form.transcription = props.word?.transcription ?? ''
  form.meaning = props.word?.meaning ?? ''
  form.example = props.word?.example ?? ''
  form.type = props.word?.type ?? ''
  form.topic = props.word?.topic ?? ''
  form.level = props.word?.level ?? ''
}

function onInput(field) {
  emit('clear-error', field)
}

function submit() {
  emit('submit', { id: props.word?.id ?? null, values: { ...form } })
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
            <h5 class="modal-title">
              {{ isEditing ? 'Cập nhật từ vựng' : 'Thêm từ vựng' }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              :disabled="busy"
              @click="emit('close')"
            />
          </div>

          <div class="modal-body">
            <div v-if="errors._" class="alert alert-danger py-2">
              {{ errors._ }}
            </div>

            <div class="row">
              <div class="col-12 col-md-6 mb-3">
                <label for="word-collection" class="form-label">Bộ sưu tập</label>
                <select
                  id="word-collection"
                  v-model="form.collectionId"
                  class="form-select"
                  :class="{ 'is-invalid': errors.collectionId }"
                  @change="onInput('collectionId')"
                >
                  <option value="" disabled>— Chọn bộ sưu tập —</option>
                  <option
                    v-for="collection in collectionsStore.sortedCollections"
                    :key="collection.id"
                    :value="collection.id"
                  >
                    {{ collection.name }}
                  </option>
                </select>
                <div v-if="errors.collectionId" class="invalid-feedback">
                  {{ errors.collectionId }}
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-12 col-md-6 mb-3">
                <label for="word-word" class="form-label">Từ vựng *</label>
                <input
                  id="word-word"
                  v-model.trim="form.word"
                  type="text"
                  class="form-control"
                  :class="{ 'is-invalid': errors.word }"
                  placeholder="VD: abandon"
                  @input="onInput('word')"
                />
                <div v-if="errors.word" class="invalid-feedback">{{ errors.word }}</div>
              </div>

              <div class="col-12 col-md-6 mb-3">
                <label for="word-transcription" class="form-label">Phiên âm (IPA)</label>
                <input
                  id="word-transcription"
                  v-model.trim="form.transcription"
                  type="text"
                  class="form-control"
                  placeholder="VD: /əˈbændən/"
                  @input="onInput('transcription')"
                />
              </div>

              <div class="col-12 mb-3">
                <label for="word-meaning" class="form-label">Nghĩa *</label>
                <textarea
                  id="word-meaning"
                  v-model.trim="form.meaning"
                  rows="2"
                  class="form-control"
                  :class="{ 'is-invalid': errors.meaning }"
                  placeholder="VD: bỏ rơi, từ bỏ"
                  @input="onInput('meaning')"
                />
                <div v-if="errors.meaning" class="invalid-feedback">
                  {{ errors.meaning }}
                </div>
              </div>

              <div class="col-12 mb-3">
                <label for="word-example" class="form-label">Ví dụ</label>
                <textarea
                  id="word-example"
                  v-model.trim="form.example"
                  rows="2"
                  class="form-control"
                  placeholder="VD: He abandoned his car."
                  @input="onInput('example')"
                />
              </div>
            </div>

            <!-- FR-W08: dropdown of existing values + free typing -->
            <ComboBoxField
              id="word-type"
              label="Loại từ (type)"
              :model-value="form.type"
              :options="options.type"
              :error="errors.type || ''"
              placeholder="VD: noun, verb, adjective…"
              hint="Chọn từ danh sách hoặc gõ giá trị mới."
              @update:model-value="(v) => { form.type = v; onInput('type') }"
            />

            <ComboBoxField
              id="word-topic"
              label="Chủ đề (topic)"
              :model-value="form.topic"
              :options="options.topic"
              :error="errors.topic || ''"
              placeholder="VD: Family, Travel, Food…"
              @update:model-value="(v) => { form.topic = v; onInput('topic') }"
            />

            <ComboBoxField
              id="word-level"
              label="Cấp độ (level)"
              :model-value="form.level"
              :options="options.level"
              :error="errors.level || ''"
              placeholder="VD: A1, A2, B1…"
              @update:model-value="(v) => { form.level = v; onInput('level') }"
            />
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
            <button type="submit" class="btn btn-primary" :disabled="busy">
              <span
                v-if="busy"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              />
              {{ isEditing ? 'Lưu' : 'Thêm' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <div v-if="visible" class="modal-backdrop fade show" aria-hidden="true" />
  </Teleport>
</template>