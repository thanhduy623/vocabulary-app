<script setup>
// Skill Selection screen (FR-L04, BR-33; continue flow BR-63/64, req §18/§19).
//
// Two modes:
//  - PICKER   (no running session): toggle 1..4 skill cards → BẮT ĐẦU starts
//             the session via learningStore.
//  - CONTINUE (session exists): show the session's skills with live status;
//             click a pending one to enter it; completed ones show ✓. When
//             every selected skill is done a completion banner appears.

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLearningStore } from '@/stores/learningStore'
import { listSkillMetas } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'

const router = useRouter()
const store = useLearningStore()

/** All registered skills (single source of truth = engine registry). */
const ALL_SKILLS = listSkillMetas()

const isContinueMode = computed(() => Boolean(store.learningSession))

function statusOf(skillId) {
  if (!store.learningSession) return null
  return store.learningSession.skills[skillId]?.status ?? 'pending'
}

const progressOf = (skillId) =>
  store.learningSession ? store.learningSession.skills[skillId] : null

function isSelected(skillId) {
  return store.selectedSkillIds.includes(skillId)
}

function onCardClick(skillId) {
  if (!isContinueMode.value) {
    store.toggleSkill(skillId)
    return
  }
  // Pending → enter; completed → process isn't remembered, so re-entering
  // regenerates a fresh plan (store.enterSkill handles the reset).
  if (store.enterSkill(skillId)) {
    router.push({ name: 'learning', params: { skillId } })
  }
}

async function startLearning() {
  const res = store.startSession()
  if (!res.ok) return
  router.push({
    name: 'learning',
    params: { skillId: res.skillId ?? store.activeSkillId },
  })
}

function backToWords() {
  store.backToWordSelection()
  router.push({ name: 'word-selection' })
}

function goHome() {
  store.resetLearningContext()
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="skill-selection-view">
    <!-- Session complete banner (BR-64) -->
    <div v-if="isContinueMode && store.isSessionComplete" class="alert alert-success d-flex flex-wrap align-items-center gap-2">
      <div class="me-auto">
        <strong>🎉 Hoàn thành phiên học!</strong>
        <span class="d-block small">Bạn đã hoàn thành tất cả kỹ năng đã chọn.</span>
      </div>
      <button type="button" class="btn btn-sm btn-outline-success" @click="backToWords">
        Chọn từ khác
      </button>
      <button type="button" class="btn btn-sm btn-success" @click="goHome">
        Về trang chủ
      </button>
    </div>

    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h3 mb-0">
        {{ isContinueMode ? 'Tiếp tục phiên học' : 'Chọn chế độ học' }}
      </h1>
      <span v-if="!isContinueMode" class="badge text-bg-primary">
        Đã chọn: {{ store.selectedSkillIds.length }}
      </span>
    </div>

    <p class="text-muted">
      {{
        isContinueMode
          ? 'Nhấp vào một kỹ năng chưa hoàn thành để tiếp tục.'
          : 'Chọn ít nhất 01 chế độ để bắt đầu. Bạn có thể chọn nhiều chế độ.'
      }}
    </p>

    <div class="row g-3">
      <div
        v-for="skill in ALL_SKILLS"
        :key="skill.id"
        class="col-12 col-sm-6 col-lg-3"
      >
        <button
          type="button"
          class="card h-100 w-100 border text-start p-0 skill-card position-relative"
          :title="
            isContinueMode && statusOf(skill.id) === 'completed'
              ? 'Nhấp để học lại từ đầu'
              : null
          "
          :class="{
            'border-primary': !isContinueMode && isSelected(skill.id),
            'opacity-75':
              isContinueMode &&
              statusOf(skill.id) === 'completed' &&
              store.isSessionComplete,
          }"
          @click="onCardClick(skill.id)"
        >
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h2 class="h5 card-title mb-1">{{ skill.label }}</h2>

              <!-- Continue mode status -->
              <span
                v-if="isContinueMode && statusOf(skill.id) === 'completed'"
                class="badge text-bg-success"
              >
                ✓ Hoàn thành
              </span>
              <span
                v-else-if="isContinueMode"
                class="badge text-bg-warning text-dark"
              >
                Còn lại
              </span>

              <!-- Picker mode check -->
              <span v-else-if="isSelected(skill.id)" class="badge text-bg-primary">
                ✓
              </span>
            </div>

            <p class="card-text small text-muted mb-2">{{ skill.description }}</p>

            <!-- Per-skill progress in continue mode -->
            <ProgressStats
              v-if="isContinueMode && progressOf(skill.id)"
              :progress="progressOf(skill.id)"
              class="mb-0"
            />
          </div>
        </button>
      </div>
    </div>

    <!-- Sticky start bar: picker mode only -->
    <div v-if="!isContinueMode" class="sticky-action-bar text-end">
      <button
        type="button"
        class="btn btn-primary d-inline-flex align-items-center gap-2"
        :disabled="!store.canStart"
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
.skill-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.skill-card:disabled {
  cursor: default;
}
</style>