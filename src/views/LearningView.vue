<script setup>
// Hosts the active skill's game component (FR-L05..L11).
// Route: /learn/:skillId — validates against the running session, begins
// (or resumes) the skill, and returns to Skill Selection on exit/completion.

import { computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useLearningStore } from '@/stores/learningStore'
import FlashCardGame from '@/components/learning/skills/FlashCardGame.vue'
import MultipleChoiceGame from '@/components/learning/skills/MultipleChoiceGame.vue'
import ListeningGame from '@/components/learning/skills/ListeningGame.vue'
import TypingGame from '@/components/learning/skills/TypingGame.vue'
import ProgressStats from '@/components/learning/ProgressStats.vue'

const route = useRoute()
const router = useRouter()
const store = useLearningStore()

const skillId = computed(() => String(route.params.skillId ?? ''))
const skillMeta = computed(
  () => store.learningSession?.skills?.[skillId.value]?.meta ?? null,
)
const progress = computed(() =>
  skillId.value === store.activeSkillId ? store.currentProgress : null,
)

/** Component registry — adding a skill UI = one entry here. */
const GAME_COMPONENTS = {
  FLASH_CARD: FlashCardGame,
  MULTIPLE_CHOICE: MultipleChoiceGame,
  LISTENING: ListeningGame,
  TYPING: TypingGame,
}

const gameComponent = computed(() => GAME_COMPONENTS[skillId.value] ?? null)

// Validate the route against the session; begin/resume the skill.
if (
  !store.learningSession ||
  !store.learningSession.selectedSkillOrder.includes(skillId.value)
) {
  router.replace({ name: 'skill-selection' })
} else {
  if (store.activeSkillId !== skillId.value) {
    store.enterSkill(skillId.value)
  }
}

/**
 * Any navigation away from an ACTIVE skill (header Back, browser Back, …)
 * forgets that skill's process; the word list chosen earlier stays intact.
 * Natural completion already released the pointer via finishActiveSkill(),
 * so the guard is a no-op there.
 */
onBeforeRouteLeave(() => {
  if (store.activeSkillId) {
    store.abandonActiveSkill()
  }
})

/** FlashCardGame finished naturally → keep the ✓ record, go pick next skill. */
function onSkillCompleted() {
  store.finishActiveSkill()
  router.push({ name: 'skill-selection' })
}
</script>

<template>
  <section class="learning-view learning-shell">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div class="d-flex align-items-center gap-2">
        <h1 class="h5 mb-0">{{ skillMeta?.label ?? skillId }}</h1>
        <span
          v-if="store.isSkillCompletedNow"
          class="badge text-bg-success"
        >
          Hoàn thành ✓
        </span>
      </div>
    </div>

    <!-- Fallback stats when the game doesn't render its own -->
    <ProgressStats v-if="progress && !gameComponent" :progress="progress" />

    <!-- Skill host: one registered component per skill id -->
    <component
      :is="gameComponent"
      v-if="gameComponent"
      @completed="onSkillCompleted"
    />

    <div
      v-else
      class="flex-fill d-flex align-items-center justify-content-center text-muted border rounded p-4 my-3"
    >
      Kỹ năng này chưa có giao diện luyện tập.
    </div>
  </section>
</template>