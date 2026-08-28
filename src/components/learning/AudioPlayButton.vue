<script setup>
// AudioPlayButton — reusable TTS replay trigger shared by all four skill
// games (flashcard / multiple-choice / listening / typing), §7.1/§7.3.
//
// The component NEVER touches the Web Speech API: parents own speak() via
// services/speech and pass `unavailable` (AMB-12) to disable the button.
// Variants:
//   variant="icon"  → round 44px ghost glyph (flashcard corner; floats above
//                     the flipping card, so the native click is stopped).
//   variant="label" → outline-primary button with 🔊 + text.
//   large           → stacks the glyph above the label (listening replay).

import { computed } from 'vue'

const props = defineProps({
  /** Whether the last TTS attempt failed — disables the button (AMB-12). */
  unavailable: {
    type: Boolean,
    default: false,
  },
  /** 'icon' → round ghost glyph; 'label' → outline button with text. */
  variant: {
    type: String,
    default: 'label',
    validator: (value) => ['icon', 'label'].includes(value),
  },
  /** Visible text for the 'label' variant. */
  label: {
    type: String,
    default: 'Nghe',
  },
  /** Large stacked layout (listening's big replay button). */
  large: {
    type: Boolean,
    default: false,
  },
  /** Accessible name; defaults to 'Phát âm' (icon) or `label`. */
  ariaLabel: {
    type: String,
    default: '',
  },
})

defineEmits(['play'])

const UNAVAILABLE_TEXT = 'Thiết bị không hỗ trợ đọc phát âm'

const accessibleName = computed(() =>
  props.ariaLabel || (props.variant === 'icon' ? 'Phát âm' : props.label),
)
const tooltip = computed(() =>
  props.unavailable ? UNAVAILABLE_TEXT : accessibleName.value,
)
</script>

<template>
  <button
    type="button"
    class="audio-play-btn"
    :class="[
      variant === 'icon' ? 'is-icon' : 'is-label btn btn-outline-primary',
      { 'is-lg': large },
    ]"
    :disabled="unavailable"
    :title="tooltip"
    :aria-label="accessibleName"
    @click.stop="$emit('play')"
  >
    <span class="audio-glyph" aria-hidden="true">🔊</span>
    <span
      v-if="variant === 'label'"
      class="audio-text"
      :class="{ 'd-block': large }"
    >
      {{ label }}
    </span>
  </button>
</template>

<style scoped>
/* Icon variant: round 44px ghost button — token-only (§9). */
.audio-play-btn.is-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  font-size: 1.15rem;
  line-height: 1;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background-color: var(--app-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition:
    transform 150ms ease,
    border-color 150ms ease;
}

.audio-play-btn.is-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(var(--app-brand-rgb), 0.45);
}

/* Label variant keeps Bootstrap outline-primary + the global 44px rule. */
.audio-play-btn.is-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

/* Large variant: stacked glyph over label (listening replay). */
.audio-play-btn.is-lg {
  padding: 1rem 2rem;
  border-radius: 0.9rem;
}

.audio-play-btn.is-lg .audio-glyph {
  font-size: 2.2rem;
  line-height: 1;
}

.audio-play-btn.is-lg .audio-text {
  font-size: 1rem;
  margin-top: 0.25rem;
}

/* TTS unavailable (AMB-12): clearly disabled. */
.audio-play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* P10 / §8.4 — remove non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .audio-play-btn.is-icon,
  .audio-play-btn.is-icon:hover:not(:disabled) {
    transform: none;
    transition: none;
  }
}
</style>
