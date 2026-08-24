<script setup>
import { ref, computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

const result = ref(undefined) // 'resolve' handle
const busy = ref(false)

const config = computed(() => uiStore.confirmState)

async function confirm() {
  busy.value = true
  try {
    await uiStore.confirmResolve(true)
  } finally {
    busy.value = false
  }
}

function cancel() {
  uiStore.confirmResolve(false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="config"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      @click.self="cancel"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ config.title || 'Confirm' }}</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="cancel"
            />
          </div>
          <div v-if="config.message" class="modal-body">
            <p class="mb-0">{{ config.message }}</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="busy"
              @click="cancel"
            >
              {{ config.cancelText || 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn"
              :class="config.danger ? 'btn-danger' : 'btn-primary'"
              :disabled="busy"
              @click="confirm"
            >
              {{ config.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="config"
      class="modal-backdrop fade show"
      aria-hidden="true"
    />
  </Teleport>
</template>