<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  /** Existing collection when editing; null when creating (FR-C02/FR-C03). */
  collection: {
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
  /** Validation/DB errors keyed by field, surfaced on the form (FR-C06). */
  errors: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['submit', 'close', 'clear-error'])

const form = reactive({
  name: '',
  language: '',
  symbol: '',
})

const isEditing = computed(() => Boolean(props.collection))

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      reset()
    }
  },
)

function reset() {
  form.name = props.collection?.name ?? ''
  form.language = props.collection?.language ?? ''
  form.symbol = props.collection?.symbol ?? ''
}

function onInput(field) {
  // Signal the parent to clear this field's error as the user retypes.
  emit('clear-error', field)
}

function submit() {
  emit('submit', {
    id: props.collection?.id ?? null,
    values: { ...form },
  })
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
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content" novalidate @submit.prevent="submit">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ isEditing ? 'Cập nhật bộ sưu tập' : 'Tạo bộ sưu tập' }}
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
            <!-- General (non-field) error banner -->
            <div v-if="errors._" class="alert alert-danger py-2">
              {{ errors._ }}
            </div>

            <div class="mb-3">
              <label for="collection-name" class="form-label">Tên bộ sưu tập</label>
              <input
                id="collection-name"
                v-model.trim="form.name"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errors.name }"
                placeholder="VD: TOEIC 600"
                @input="onInput('name')"
              />
              <div v-if="errors.name" class="invalid-feedback">
                {{ errors.name }}
              </div>
            </div>

            <div class="mb-3">
              <label for="collection-language" class="form-label">Ngôn ngữ</label>
              <input
                id="collection-language"
                v-model.trim="form.language"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errors.language }"
                placeholder="VD: Tiếng Anh"
                @input="onInput('language')"
              />
              <div v-if="errors.language" class="invalid-feedback">
                {{ errors.language }}
              </div>
            </div>

            <div class="mb-3">
              <label for="collection-symbol" class="form-label">Ký hiệu ngôn ngữ</label>
              <input
                id="collection-symbol"
                v-model.trim="form.symbol"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errors.symbol }"
                placeholder="VD: en, vi, zh-CN"
                @input="onInput('symbol')"
              />
              <div v-if="errors.symbol" class="invalid-feedback">
                {{ errors.symbol }}
              </div>
              <div class="form-text">Iso-style code dùng cho chức năng phát âm.</div>
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
            <button type="submit" class="btn btn-primary" :disabled="busy">
              <span
                v-if="busy"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              />
              {{ isEditing ? 'Lưu' : 'Tạo' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <div v-if="visible" class="modal-backdrop fade show" aria-hidden="true" />
  </Teleport>
</template>