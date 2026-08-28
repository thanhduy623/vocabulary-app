<script setup>
// Skill Options screen (new workflow step, FR-L04b): pick which option mixes
// to practice per selected skill, then start the session. The session only
// begins when the learner clicks "Bắt đầu học" here (BR-35).
// Leaving = changing skills (→ Skill Selection resets the skill selection,
// BR-71 spirit) or abandoning the flow (→ Home resets everything).
//
// All options are preselected by default. The Start button lives inside the
// picker (SkillOptionsPicker emits 'start'); it's gated on ≥1 option per skill.
// Options ride into the session snapshot (skillOptions).

import { reactive, computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/router/routes'
import { useLearningStore } from '@/stores/learningStore'
import { listSkillMetas } from '@/engine'
import SkillOptionsPicker from '@/components/learning/SkillOptionsPicker.vue'

const router = useRouter()
const store = useLearningStore()

/** Metas of the selected skills (single-select today, multi-ready). */
const selectedSkills = computed(() =>
  listSkillMetas().filter((m) => store.selectedSkillIds.includes(m.id)),
)

/** Local selection state: { [skillId]: string[] } — all options preselected. */
const selectedOptions = reactive(
  Object.fromEntries(
    selectedSkills.value.map((m) => [m.id, m.options.map((o) => o.id)]),
  ),
)

/** Every selected skill needs at least 1 option before starting. */
const canStart = computed(() =>
  selectedSkills.value.every((m) => (selectedOptions[m.id] ?? []).length > 0),
)

/** Start the session with the chosen option mixes (official begin, BR-35). */
function startLearning() {
  if (!canStart.value) return
  const res = store.startSession({ ...selectedOptions })
  if (!res.ok) return
  router.push({
    name: ROUTE_NAMES.learning,
    params: { skillId: res.skillId ?? store.activeSkillId },
  })
}

onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAMES.skillSelection) {
    store.setSelectedSkillIds([])
  } else if (to.name === ROUTE_NAMES.home) {
    store.resetLearningContext()
  }
})
</script>

<template>
  <section class="skill-options-view learning-shell">

    <div class="learning-stage">
      <h2 class="text-center mt-3">TUỲ CHỌN CHẾ ĐỘ HỌC</h2>
      <p class="text-muted small options-intro">
        Chọn các dạng câu hỏi bạn muốn luyện — chọn nhiều tùy chọn để trộn
        ngẫu nhiên trong phiên học.
      </p>

      <div class="options-stack d-flex flex-column gap-3">
        <SkillOptionsPicker
          v-for="skill in selectedSkills"
          :key="skill.id"
          v-model="selectedOptions[skill.id]"
          :label="skill.label"
          :description="skill.description"
          :options="skill.options"
          @start="startLearning"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.options-intro {
  max-width: min(640px, 100%);
  margin: 0 auto 0.75rem;
}

.options-stack {
  width: min(640px, 100%);
  margin: 0 auto;
}
</style>
