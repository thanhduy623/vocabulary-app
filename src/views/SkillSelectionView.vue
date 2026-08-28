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

/** Single-select: picking a card selects it alone; picking it again clears it. */
function toggleSkill(skillId) {
  if (isSelected(skillId)) store.setSelectedSkillIds([])
  else store.setSelectedSkillIds([skillId])
}

/** Skills picked → proceed to the per-skill options step (new workflow). */
function proceedToOptions() {
  router.push({ name: ROUTE_NAMES.skillOptions })
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
    <!-- Page header (§12): title left, selection badge right — same anatomy
         as Word Selection for flow consistency. -->
    <header
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-2 mb-4"
    >
      <h1 class="h3 mb-0">Chọn chế độ học</h1>
      <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="!store.canStart"
          @click="proceedToOptions"
        >
          Tiếp
          <span aria-hidden="true">&rarr;</span>
        </button>
    </header>

    <div class="row g-3 g-lg-4">
      <div
        v-for="skill in ALL_SKILLS"
        :key="skill.id"
        class="col-12 col-sm-6 col-lg-3"
      >
        <button
          type="button"
          class="card h-100 w-100 text-start p-0 skill-card position-relative"
          :class="{ 'is-selected': isSelected(skill.id) }"
          :aria-pressed="isSelected(skill.id)"
          @click="toggleSkill(skill.id)"
        >
          <div class="card-body d-flex flex-column gap-2">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <!-- Icon tile: brand gradient avatar language (§7.1 CollectionCard).
                   Glyph comes from the engine meta (cards/list-check/headphones/keyboard). -->
              <span class="skill-icon" aria-hidden="true">
                <svg
                  v-if="skill.icon === 'cards'"
                  class="skill-glyph"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="7.5" y="3.5" width="13" height="13" rx="2" />
                  <path d="M16.5 16.5v2a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
                </svg>
                <svg
                  v-else-if="skill.icon === 'list-check'"
                  class="skill-glyph"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3.5 5.5 5 7l2.5-2.5" />
                  <path d="M11 6h9.5" />
                  <path d="M3.5 12.5 5 14l2.5-2.5" />
                  <path d="M11 13h9.5" />
                  <path d="M11 20h9.5" />
                </svg>
                <svg
                  v-else-if="skill.icon === 'headphones'"
                  class="skill-glyph"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
                  <rect x="3" y="14" width="4.5" height="6.5" rx="1.5" />
                  <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5" />
                </svg>
                <svg
                  v-else
                  class="skill-glyph"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                  <path
                    d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M9.5 13h.01M13 13h.01M16.5 13h.01M8 15.5h8"
                  />
                </svg>
              </span>

              <!-- ✓ mark pairs with color so selection is never color-only (§9.4) -->
              <span v-if="isSelected(skill.id)" class="skill-check" aria-hidden="true">
                ✓
              </span>
            </div>

            <h2 class="h5 card-title skill-title mb-0">{{ skill.label }}</h2>
            <p class="card-text small text-muted mb-0">{{ skill.description }}</p>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------------------------------------------------------------
   Skill cards (§7.5): flat surface, hairline border, rest shadow.
   Exactly the documented elevation levels (§3.3) — no heavy shadows.
   --------------------------------------------------------------- */
.skill-card {
  cursor: pointer;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    background-color 150ms ease;
}

/* Hover/focus lift (§3.3 level 2) + brand focus ring — explicit
   :focus-visible style, keyboard parity with mouse hover (§10). */
.skill-card:hover,
.skill-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(var(--app-brand-rgb), 0.45);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 3px rgba(var(--app-brand-rgb), 0.12);
}

/* Selected state (§7.5): brand border + soft brand tint (§9.1). The ✓ mark
   pairs with the color so selection is never color-only (§9.4). */
.skill-card.is-selected {
  border-color: var(--app-brand);
  background: linear-gradient(
    180deg,
    rgba(var(--app-brand-rgb), 0.07),
    rgba(var(--app-brand-rgb), 0) 70%
  );
  box-shadow: 0 6px 18px rgba(var(--app-brand-rgb), 0.18);
}

/* ---------------------------------------------------------------
   Icon tile — same brand-gradient avatar language as CollectionCard
   (§7.1), giving each skill a recognizable, theme-consistent mark.
   --------------------------------------------------------------- */
.skill-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 0.9rem;
  background: linear-gradient(
    135deg,
    var(--app-brand),
    rgba(var(--app-brand-rgb), 0.72)
  );
  color: var(--app-brand-contrast);
  box-shadow: 0 6px 18px rgba(var(--app-brand-rgb), 0.35);
}

.skill-glyph {
  width: 1.4rem;
  height: 1.4rem;
}

/* Selected mark pops in — state-change animation, transform/opacity
   only, ≤ 450ms (P10 / §8). */
.skill-check {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  min-width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background-color: var(--app-brand);
  color: var(--app-brand-contrast);
  font-size: 0.8rem;
  animation: skill-check-pop 150ms ease-out;
}

@keyframes skill-check-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Card title reads as primary content (§6): 600 weight. */
.skill-title {
  font-weight: 600;
}

/* P10 / §8.4 — remove non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .skill-card,
  .skill-card:hover,
  .skill-card:focus-visible {
    transform: none;
    transition: none;
  }

  .skill-check {
    animation: none;
  }
}
</style>