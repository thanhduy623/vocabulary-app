<script setup>
// SkillOptionsPicker — reusable option selector for ONE skill (FR-L04b).
// Used by SkillOptionsView: one picker per selected skill. The parent owns
// the selection (v-model = selected option ids); the component never touches
// the store, so it works for any skill that ships a meta.options catalog.
//
// - toggle rows with aria-pressed + ✓ mark (§9.4: color is never the only signal)
// - Start button (emits 'start') placed in the header; the parent starts the
//   session — the component stays store-free and reusable for any skill
// - inline hint when nothing is selected (button gates on ≥1 per skill)

import { computed } from 'vue'

const props = defineProps({
  /** Skill display name. */
  label: {
    type: String,
    required: true,
  },
  /** Optional skill description under the label. */
  description: {
    type: String,
    default: '',
  },
  /** Option catalog: [{ id, label }] — the engine's meta.options. */
  options: {
    type: Array,
    required: true,
  },
  /** Selected option ids (v-model). */
  modelValue: {
    type: Array,
    required: true,
  },
  /** Label for the primary Start button. */
  startLabel: {
    type: String,
    default: 'Bắt đầu',
  },
})

const emit = defineEmits(['update:modelValue', 'start'])

const selectedCount = computed(() =>
  props.options.filter((o) => props.modelValue.includes(o.id)).length,
)
const canStart = computed(() => selectedCount.value > 0)

function isSelected(id) {
  return props.modelValue.includes(id)
}

function toggle(id) {
  emit(
    'update:modelValue',
    isSelected(id)
      ? props.modelValue.filter((v) => v !== id)
      : [...props.modelValue, id],
  )
}

function start() {
  if (!canStart.value) return
  emit('start')
}
</script>

<template>
  <section class="card skill-options-picker">
    <header class="sop-head">
      <div class="min-w-0">
        <h2 class="h6 mb-0">{{ label }}</h2>
        <p v-if="description" class="small text-muted mb-0">
          {{ description }}
        </p>
      </div>
      <!-- Primary Start action lives here (was the Deselect button). -->
      <button
        type="button"
        class="btn btn-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
        :disabled="!canStart"
        @click="start"
      >
        {{ startLabel }}
        <span aria-hidden="true">&rarr;</span>
      </button>
    </header>

    <div class="sop-list" role="group" :aria-label="`Tùy chọn cho ${label}`">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="sop-option"
        :class="{ 'is-selected': isSelected(opt.id) }"
        :aria-pressed="isSelected(opt.id)"
        @click="toggle(opt.id)"
      >
        <span class="sop-check" aria-hidden="true">
          {{ isSelected(opt.id) ? '✓' : '' }}
        </span>
        <span class="sop-label">{{ opt.label }}</span>
      </button>
    </div>

    <p v-if="selectedCount === 0" class="small text-danger mb-0 mt-2" role="status">
      Chọn ít nhất 1 tùy chọn để bắt đầu.
    </p>
  </section>
</template>

<style scoped>
.skill-options-picker {
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  padding: 1rem 1.1rem 1.1rem;
}

.sop-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.sop-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Toggle row: ≥44px target (§10), token-only selected state (§9.1). */
.sop-option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  min-height: 44px;
  padding: 0.55rem 0.875rem;
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background-color: var(--app-surface);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.sop-option:hover {
  border-color: rgba(var(--app-brand-rgb), 0.45);
}

.sop-option.is-selected {
  border-color: var(--app-brand);
  background: linear-gradient(
    180deg,
    rgba(var(--app-brand-rgb), 0.07),
    rgba(var(--app-brand-rgb), 0) 70%
  );
}

/* Checkbox-style mark; pops in on select (state-change animation, P10). */
.sop-check {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid var(--app-border);
  border-radius: 0.375rem;
  background-color: var(--app-surface);
  color: var(--app-brand-contrast);
  font-size: 0.8rem;
  font-weight: 700;
}

.sop-option.is-selected .sop-check {
  border-color: var(--app-brand);
  background-color: var(--app-brand);
  animation: sop-check-pop 150ms ease-out;
}

@keyframes sop-check-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.sop-label {
  flex: 1 1 auto;
  overflow-wrap: anywhere;
  font-weight: 500;
}

.sop-option.is-selected .sop-label {
  color: var(--app-brand);
  font-weight: 600;
}

/* Shrinkable flex children need min-width: 0 (§3.2). */
.min-w-0 {
  min-width: 0;
}

/* P10 / §8.4 — remove non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .sop-check {
    animation: none;
  }
}
</style>
