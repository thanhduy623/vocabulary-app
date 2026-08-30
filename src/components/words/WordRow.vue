<script setup>
// One word row in the management table (FR-W01 list + FR-W06/W07 actions).
// Columns per UI spec: Word · Pronunciation · Meaning · Category · Actions.
// Category renders the classification badges (type / topic / level).

defineProps({
  word: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit', 'delete', 'toggle'])
</script>

<template>
  <tr class="word-row">
    <td class="word-check">
      <input
        type="checkbox"
        class="form-check-input m-0 select-checkbox"
        :checked="selected"
        :disabled="busy"
        :aria-label="`Chọn từ ${word.word}`"
        @change="$emit('toggle', word.id)"
      />
    </td>
    <td class="fw-semibold">{{ word.word }}</td>
    <td class="text-muted word-transcription">{{ word.transcription }}</td>
    <td class="word-meaning">{{ word.meaning }}</td>
    <td class="word-category">
      <span v-if="word.type" class="badge text-bg-light me-1">{{ word.type }}</span>
      <span v-if="word.topic" class="badge text-bg-light me-1">{{ word.topic }}</span>
      <span v-if="word.level" class="badge text-bg-secondary">{{ word.level }}</span>
      <span
        v-if="!word.type && !word.topic && !word.level"
        class="small text-muted"
        aria-hidden="true"
      >
        —
      </span>
    </td>
    <td class="text-end text-nowrap">
      <div class="d-inline-flex gap-1 justify-content-end">
        <button
          type="button"
          class="btn btn-outline-secondary word-icon-btn"
          :disabled="busy"
          :aria-label="`Sửa từ ${word.word}`"
          title="Sửa"
          @click="$emit('edit', word.id)"
        >
          <svg
            class="word-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M11.2 2.8a1.4 1.4 0 0 1 2 2L6 12l-2.9.9L4 10l7.2-7.2z" />
          </svg>
        </button>
        <button
          type="button"
          class="btn btn-outline-danger word-icon-btn"
          :disabled="busy"
          :aria-label="`Xóa từ ${word.word}`"
          title="Xoá"
          @click="$emit('delete', word.id)"
        >
          <svg
            class="word-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M2.75 4.5h10.5M6 4.5V3.4c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.1M4.5 4.5l.5 7.6c0 .8.6 1.4 1.4 1.4h3.2c.8 0 1.4-.6 1.4-1.4l.5-7.6"
            />
          </svg>
        </button>
      </div>
    </td>
  </tr>
</template>

<style scoped>
/* Brand-tinted row hover (§9.1 token tint) + micro transition (§8). */
.word-row {
  transition: background-color 150ms ease;
}
.word-row:hover {
  background-color: rgba(var(--app-brand-rgb), 0.04);
}

/* Pronunciation reads as data — system monospace (no web fonts, §3.2). */
.word-transcription {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
  font-size: 0.875rem;
}

/* Meanings can be long — wrap safely, never stretch the table (§3.2). */
.word-meaning {
  min-width: 12rem;
  overflow-wrap: anywhere;
}

/* Square 44px icon buttons (§10 — touch targets). */
.word-icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
}

.word-icon {
  width: 1.05em;
  height: 1.05em;
}

/* Larger checkbox = easier touch target inside the row (§10). */
.select-checkbox {
  width: 1.25rem;
  height: 1.25rem;
}
</style>