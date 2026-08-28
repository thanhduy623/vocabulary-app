<script setup>
// Shared learning progress bar + stat chips (FR-L10, BR-60..62).
// Rendered on every learning screen: completed / remaining / total,
// correct / incorrect, plus a visual progress bar.

import { computed } from 'vue'

const props = defineProps({
  /** { total, completed, remaining, correct, incorrect, status } */
  progress: {
    type: Object,
    required: true,
  },
})

const percent = computed(() => {
  if (!props.progress.total) return 0
  return Math.round((props.progress.completed / props.progress.total) * 100)
})
</script>

<template>
  <div class="progress-stats mb-3">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <!-- Semantic badges per §3.1/§9.2: success = learned/progress,
           warning + text-dark = pending, success/danger = correct/wrong
           (✓/⏳ icons keep color from being the only signal, §9.4). -->
      <span class="badge text-bg-success">
        ✓ Hoàn thành: {{ progress.completed }} / {{ progress.total }}
      </span>
      <span class="badge text-bg-warning text-dark">
        ⏳ Còn lại: {{ progress.remaining }}
      </span>
      <span class="badge text-bg-success">Đúng: {{ progress.correct }}</span>
      <span class="badge text-bg-danger">Sai: {{ progress.incorrect }}</span>
      <span class="ms-auto fw-semibold small text-muted">{{ percent }}%</span>
    </div>

    <div
      class="progress"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Tiến độ học"
    >
      <div
        class="progress-bar bg-success progress-bar-striped"
        :class="{ 'progress-bar-animated': progress.status === 'active' }"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress {
  height: 0.6rem;
}
</style>