<script setup>
// Skill Selection screen (FR-L04, BR-33, req §16/§18).
//
// Fresh multi-select picker every time it's shown. Leaving Learning (exit or
// completion) clears the whole session progression (learningStore
// .clearLearningSession), so the cards never show stale progress or lock the
// learner into the previous selection — any skill can be (re)chosen freely.
// The collection + chosen words are preserved so starting again is one tap.

import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/router/routes'
import { useLearningStore } from '@/stores/learningStore'
import { listSkillMetas } from '@/engine'

const router = useRouter()
const store = useLearningStore()

/** All registered skills (single source of truth = engine registry). */
const ALL_SKILLS = listSkillMetas()

function isSelected(skillId) {
  return store.selectedSkillIds.includes(skillId)
}

function toggleSkill(skillId) {
  store.toggleSkill(skillId)
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
  // State reset is applied by onBeforeRouteLeave (BR-71) — navigation alone.
  router.push({ name: ROUTE_NAMES.wordSelection })
}

/**
 * BR-71/72 (requirements §20): Skill Selection → Word Selection resets the
 * session + skill selection (keeps collection + words); → Home resets the whole
 * learning context. Applied on ANY leave — buttons, header Back, browser Back.
 */
onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAMES.wordSelection) {
    store.backToWordSelection()
  } else if (to.name === ROUTE_NAMES.home) {
    store.resetLearningContext()
  }
})
</script>

<template>
  <section class="skill-selection-view">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h3 mb-0">Chọn chế độ học</h1>
      <span class="badge text-bg-primary">
        Đã chọn: {{ store.selectedSkillIds.length }}
      </span>
    </div>

    <p class="text-muted">
      Chọn ít nhất 01 chế độ để bắt đầu. Bạn có thể chọn nhiều chế độ.
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
          :class="{ 'border-primary': isSelected(skill.id) }"
          @click="toggleSkill(skill.id)"
        >
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h2 class="h5 card-title mb-1">{{ skill.label }}</h2>
              <span v-if="isSelected(skill.id)" class="badge text-bg-primary">
                ✓
              </span>
            </div>

            <p class="card-text small text-muted mb-2">{{ skill.description }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Sticky footer: back to words + start (BR-33, min 1 skill) -->
    <div class="sticky-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
        @click="backToWords"
      >
        <span aria-hidden="true">&larr;</span>
        Quay lại từ vựng
      </button>

      <div class="d-inline-flex align-items-center gap-2 ms-auto">
        <span
          v-if="store.selectedSkillIds.length === 0"
          class="small text-muted d-none d-sm-inline"
        >
          Chọn ít nhất 1 kỹ năng
        </span>
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