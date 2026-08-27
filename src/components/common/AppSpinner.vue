<script setup>
defineProps({
  label: {
    type: String,
    default: 'Loading',
  },
  centered: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div
    class="app-spinner d-flex flex-column align-items-center justify-content-center gap-2 py-5"
    :class="{ 'min-vh-50': centered }"
    role="status"
    aria-live="polite"
  >
    <div
      class="spinner-border text-primary"
      role="status"
      aria-hidden="true"
    />
    <span class="text-muted small">{{ label }}</span>
  </div>
</template>

<style scoped>
.min-vh-50 {
  /* P3/§4.3 — viewport-aware, never bare vh (mobile browser chrome). */
  min-height: 50svh;
  min-height: 50dvh;
}
</style>