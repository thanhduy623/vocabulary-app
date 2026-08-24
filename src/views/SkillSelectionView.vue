<script setup>
import { useRouter } from 'vue-router'
import { useLearningStore } from '@/stores/learningStore'

const router = useRouter()
const learningStore = useLearningStore()

const SKILL_ITEMS = [
  { id: 'FLASH_CARD', label: 'Thẻ nhớ', desc: 'Lật thẻ nhớ' },
  { id: 'MULTIPLE_CHOICE', label: 'Chọn từ', desc: 'Chọn đáp án đúng' },
  { id: 'LISTENING', label: 'Luyện nghe', desc: 'Nghe và chọn đáp án' },
  { id: 'TYPING', label: 'Luyện gõ', desc: 'Nhập câu trả lời' },
]

// TODO(Phase 4): only register ids from the engine registry.
function startLearning() {
  // learning.service.startLearningSession() → Phase 4
  router.push({ name: 'learning', params: { skillId: learningStore.activeSkillId } })
}
</script>

<template>
  <section class="skill-selection-view">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h3 mb-0">Chọn chế độ học</h1>
      <span class="badge text-bg-primary">
        Đã chọn: {{ learningStore.selectedSkillIds.length }}
      </span>
    </div>

    <p class="text-muted">Chọn ít nhất 01 chế độ để bắt đầu.</p>

    <div class="row g-3">
      <div
        v-for="skill in SKILL_ITEMS"
        :key="skill.id"
        class="col-12 col-sm-6 col-lg-3"
      >
        <button
          type="button"
          class="card h-100 w-100 border text-start p-0 skill-card"
          :class="{
            'border-primary': learningStore.selectedSkillIds.includes(skill.id),
          }"
          @click="learningStore.toggleSkill(skill.id)"
        >
          <div class="card-body">
            <h2 class="h5 card-title">{{ skill.label }}</h2>
            <p class="card-text small text-muted mb-0">{{ skill.desc }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Sticky start bar -->
    <div class="sticky-action-bar text-end">
      <button
        type="button"
        class="btn btn-primary d-inline-flex align-items-center gap-2"
        :disabled="!learningStore.canStart"
        @click="startLearning"
      >
        Bắt đầu học
        <span aria-hidden="true">&rarr;</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.skill-card {
  min-height: 44px;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}
.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>