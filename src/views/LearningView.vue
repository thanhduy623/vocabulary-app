<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLearningStore } from '@/stores/learningStore'

const route = useRoute()
const learningStore = useLearningStore()

const skillId = computed(() => String(route.params.skillId ?? ''))

// TODO(Phase 4): host the relevant <XxxGame.vue> based on skillId + stats bar.
</script>

<template>
  <section class="learning-view learning-shell">
    <div class="learning-stage d-flex flex-column">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h1 class="h4 mb-0">Skill: {{ skillId }}</h1>
        <span class="badge text-bg-secondary">Chưa bắt đầu</span>
      </div>

      <div class="text-center text-muted border rounded p-5 flex-fill d-flex flex-column justify-content-center">
        <p class="mb-0 fs-5">Giao diện luyện tập sẽ hiển thị tại đây.</p>
        <p class="small mb-0">(Learning engine — Phase 4)</p>
      </div>

      <div class="sticky-action-bar d-flex justify-content-center gap-2">
        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="learningStore.exitSkill(); $router.push({ name: 'skill-selection' })"
        >
          Quay lại chế độ học
        </button>
      </div>
    </div>
  </section>
</template>