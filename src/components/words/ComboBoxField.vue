<script setup>
// Reusable combobox field: dropdown suggestions + free manual typing (FR-W08).
// Implemented natively with <input list> + <datalist> for touch & keyboard support.

import { computed } from 'vue'

const props = defineProps({
  /** Unique id used to link input and datalist. */
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: String,
    default: '',
  },
  /** Suggestion options derived from the collection's words (deduped). */
  options: {
    type: Array,
    default: () => [],
  },
  error: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const listId = computed(() => `${props.id}-options`)

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="mb-3">
    <label :for="id" class="form-label">{{ label }}</label>
    <input
      :id="id"
      class="form-control"
      :class="{ 'is-invalid': error }"
      :value="modelValue"
      :list="listId"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
    />
    <datalist :id="listId">
      <option v-for="option in options" :key="option" :value="option" />
    </datalist>
    <div v-if="error" class="invalid-feedback">{{ error }}</div>
    <div v-else-if="hint" class="form-text">{{ hint }}</div>
  </div>
</template>