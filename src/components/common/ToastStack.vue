<script setup>
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
</script>

<template>
  <div
    class="toast-stack position-fixed top-0 end-0 p-3"
    style="z-index: 1090"
    aria-live="polite"
    aria-atomic="true"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        class="toast show align-items-center border-0"
        :class="`text-bg-${toast.kind || 'secondary'}`"
        role="status"
      >
        <div class="d-flex">
          <div class="toast-body">{{ toast.text }}</div>
          <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto"
            aria-label="Close"
            @click="uiStore.dismissToast(toast.id)"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-stack {
  pointer-events: none;
}
.toast-stack > * {
  pointer-events: auto;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>