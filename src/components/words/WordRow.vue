<script setup>
// One word row in the management table (FR-W01 list + FR-W06/W07 actions).

import { isoToDate } from '@/lib/datetime'

defineProps({
  word: {
    type: Object,
    required: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit', 'delete'])

function formatDate(iso) {
  const d = isoToDate(iso)
  return d ? d.toLocaleDateString() : ''
}
</script>

<template>
  <tr class="word-row">
    <td class="fw-semibold">{{ word.word }}</td>
    <td class="text-muted">{{ word.transcription }}</td>
    <td>{{ word.meaning }}</td>
    <td class="d-none d-md-table-cell">{{ word.example }}</td>
    <td class="d-none d-lg-table-cell">
      <span v-if="word.type" class="badge text-bg-light me-1">{{ word.type }}</span>
      <span v-if="word.topic" class="badge text-bg-light me-1">{{ word.topic }}</span>
      <span v-if="word.level" class="badge text-bg-secondary">{{ word.level }}</span>
    </td>
    <td class="d-none d-xl-table-cell text-muted small">
      {{ formatDate(word.createdAt) }}
    </td>
    <td class="text-end text-nowrap">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm me-1"
        :disabled="busy"
        @click="$emit('edit', word.id)"
      >
        Sửa
      </button>
      <button
        type="button"
        class="btn btn-outline-danger btn-sm"
        :disabled="busy"
        @click="$emit('delete', word.id)"
      >
        Xoá
      </button>
    </td>
  </tr>
</template>