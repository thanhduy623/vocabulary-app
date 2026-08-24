<script setup>
// Client-side search + filter controls for the word list (FR-W02, FR-W03).
// Options are derived from the current collection's words (deduplicated).
// All filtering happens in the parent (client-side, no Firebase calls — BR-27).

import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    // { search: string, type: string, topic: string, level: string }
  },
  options: {
    type: Object,
    required: true,
    // { type: string[], topic: string[], level: string[] }
  },
})

const emit = defineEmits(['update:modelValue'])

/** Emit a new filter object with one field replaced. */
function setField(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const hasActiveFilters = computed(
  () =>
    props.modelValue.search !== '' ||
    props.modelValue.type !== '' ||
    props.modelValue.topic !== '' ||
    props.modelValue.level !== '',
)

function clearAll() {
  emit('update:modelValue', {
    search: '',
    type: '',
    topic: '',
    level: '',
  })
}
</script>

<template>
  <div class="row g-2 align-items-end mb-3">
    <div class="col-12 col-md-4">
      <label for="word-search" class="form-label small text-muted mb-1">
        Tìm kiếm
      </label>
      <input
        id="word-search"
        type="search"
        class="form-control"
        placeholder="Tìm theo từ vựng..."
        :value="modelValue.search"
        @input="setField('search', $event.target.value)"
      />
    </div>

    <div class="col-6 col-md-2">
      <label for="filter-type" class="form-label small text-muted mb-1">Type</label>
      <select
        id="filter-type"
        class="form-select"
        :value="modelValue.type"
        @change="setField('type', $event.target.value)"
      >
        <option value="">Tất cả</option>
        <option v-for="opt in options.type" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="col-6 col-md-2">
      <label for="filter-topic" class="form-label small text-muted mb-1">Topic</label>
      <select
        id="filter-topic"
        class="form-select"
        :value="modelValue.topic"
        @change="setField('topic', $event.target.value)"
      >
        <option value="">Tất cả</option>
        <option v-for="opt in options.topic" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="col-6 col-md-2">
      <label for="filter-level" class="form-label small text-muted mb-1">Level</label>
      <select
        id="filter-level"
        class="form-select"
        :value="modelValue.level"
        @change="setField('level', $event.target.value)"
      >
        <option value="">Tất cả</option>
        <option v-for="opt in options.level" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="col-6 col-md-2 d-flex justify-content-md-end">
      <button
        type="button"
        class="btn btn-outline-secondary w-100"
        :disabled="!hasActiveFilters"
        title="Xóa bộ lọc"
        @click="clearAll"
      >
        Xóa lọc
      </button>
    </div>
  </div>
</template>