<script setup>
import { nextTick, ref, reactive, computed, watch } from 'vue'

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

/** Focused on open (§7.6 — keyboard-first forms). */
const nameInput = ref(null)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      reset()
      nextTick(() => nameInput.value?.focus())
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
        <form
          class="modal-content collection-modal-content"
          novalidate
          aria-labelledby="collection-modal-title"
          @submit.prevent="submit"
        >
          <div class="modal-header">
            <h5 id="collection-modal-title" class="modal-title">
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
              <label for="collection-name" class="form-label small text-muted">Tên bộ sưu tập</label>
              <input
                id="collection-name"
                ref="nameInput"
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
              <label for="collection-language" class="form-label small text-muted">Ngôn ngữ</label>
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
              <label for="collection-symbol" class="form-label small text-muted">Ký hiệu ngôn ngữ</label>
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

          <div class="modal-footer collection-modal-footer d-grid gap-2 d-sm-flex">
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
    <div v-if="visible" class="modal-backdrop fade show collection-backdrop" aria-hidden="true" />
  </Teleport>
</template>

<style scoped>
/* §7.7 — dialog card: min(420px, 100%), viewport-aware max-height, scrolls
   internally so short viewports / landscape phones keep the footer reachable. */
.collection-modal-content {
  width: min(420px, 100%);
  max-height: calc(100svh - 2rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  border-radius: 0.9rem;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
}

/* §7.7 — blurred backdrop. */
.collection-backdrop {
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

/* §7.7 — full-width footer buttons on phones + safe-area padding so controls
   stay above mobile browser chrome. */
.collection-modal-footer {
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}

/* §8.4 — drop non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .collection-modal-content.fade,
  .collection-backdrop.fade {
    transition: none;
  }
}
</style>