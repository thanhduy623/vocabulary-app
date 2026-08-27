<script setup>
// CollectionCard — premium collection tile for the Home grid (§12).
// Anatomy: brand-tinted hero (monogram avatar + title + mono code chip),
// meta row (created date + edit/delete icon buttons), action pair.
// Styling consumes tokens only (§9); the page's single primary CTA stays in
// the Home header, so every action here is outline/ghost (P8).

import { computed } from 'vue'
import { isoToDate } from '@/lib/datetime'

const props = defineProps({
  collection: {
    type: Object,
    required: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['learn', 'words', 'edit', 'delete'])

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Monogram shown in the hero avatar: symbol code, else first letter. */
const monogram = computed(() => {
  const symbol = props.collection.symbol?.trim()
  if (symbol) return symbol.slice(0, 2).toUpperCase()
  return (props.collection.name?.trim()?.[0] || '?').toUpperCase()
})

/** Human-readable created date (BR-2: immutable ISO-8601 createdAt). */
const createdLabel = computed(() => {
  const date = isoToDate(props.collection.createdAt)
  return date ? dateFmt.format(date) : ''
})
</script>

<template>
  <article class="card h-100 collection-card">
    <!-- Hero: gradient tint + monogram avatar + identity -->
    <div class="cc-hero">
      <span class="cc-avatar" aria-hidden="true">{{ monogram }}</span>

      <div class="cc-identity min-w-0">
        <h2 class="h5 cc-title text-truncate mb-2">
          {{ collection.name }}
        </h2>
        <div class="cc-sub d-flex align-items-center gap-2 min-w-0">
          <span class="small text-muted text-truncate">
            {{ collection.language }}
          </span>
        </div>
      </div>
    </div>

    <div class="cc-body">
      <!-- Meta row: created date + secondary tools -->
      <div class="cc-meta d-flex align-items-center justify-content-between gap-2">
        <span v-if="createdLabel" class="cc-date small text-muted">
          <svg
            class="cc-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="2.75" y="4" width="10.5" height="9" rx="1.5" />
            <path d="M2.75 7.25h10.5M5.5 2.5V5M10.5 2.5V5" />
          </svg>
          Tạo {{ createdLabel }}
        </span>
        <span v-else class="visually-hidden">Bộ sưu tập</span>

        <div class="cc-tools d-flex gap-1">
          <button
            type="button"
            class="btn btn-outline-secondary cc-icon-btn"
            :disabled="busy"
            :aria-label="`Cập nhật bộ sưu tập ${collection.name}`"
            title="Cập nhật"
            @click="$emit('edit', collection.id)"
          >
            <svg
              class="cc-icon"
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
            class="btn btn-outline-danger cc-icon-btn"
            :disabled="busy"
            :aria-label="`Xóa bộ sưu tập ${collection.name}`"
            title="Xoá"
            @click="$emit('delete', collection.id)"
          >
            <svg
              class="cc-icon"
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
      </div>

      <!-- Action pair (outline only — single primary lives in page header) -->
      <div class="d-flex gap-2 mt-auto">
        <button
          type="button"
          class="btn btn-outline-secondary flex-fill"
          :disabled="busy"
          @click="$emit('words', collection.id)"
        >
          Từ vựng
        </button>

        <button
          type="button"
          class="btn btn-outline-primary flex-fill fw-semibold cc-cta"
          :disabled="busy"
          @click="$emit('learn', collection.id)"
        >
          Học ngay
          <svg
            class="cc-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ---------------------------------------------------------------
   Card shell (§3.3): flat surface, hairline border, rest shadow.
   --------------------------------------------------------------- */
.collection-card {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  background-color: var(--app-surface);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

/* Hover/focus lift (§3.3 level 2) + brand focus ring (tech-forward cue). */
.collection-card:hover,
.collection-card:focus-within {
  transform: translateY(-2px);
  border-color: rgba(var(--app-brand-rgb), 0.45);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 3px rgba(var(--app-brand-rgb), 0.12);
}

/* ---------------------------------------------------------------
   Hero: brand-tinted gradient band + monogram avatar.
   Colors are rgba tints of --app-brand-rgb (§9.1 — token-only).
   --------------------------------------------------------------- */
.cc-hero {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.1rem;
  background: linear-gradient(
    135deg,
    rgba(var(--app-brand-rgb), 0.14),
    rgba(var(--app-brand-rgb), 0.05) 55%,
    rgba(var(--app-brand-rgb), 0)
  );
  border-bottom: 1px solid var(--app-border);
}

.cc-avatar {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 0.9rem;
  background: linear-gradient(
    135deg,
    var(--app-brand),
    rgba(var(--app-brand-rgb), 0.72)
  );
  color: var(--app-brand-contrast);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow: 0 6px 18px rgba(var(--app-brand-rgb), 0.35);
}

/* Shrinkable flex children need min-width: 0 (§3.2). */
.min-w-0 {
  min-width: 0;
}

.cc-title {
  font-weight: 600;
}

.cc-code {
  flex: 0 0 auto;
  max-width: 6rem;
  padding: 0.125rem 0.45rem;
  border: 1px solid rgba(var(--app-brand-rgb), 0.35);
  border-radius: 0.375rem;
  background-color: rgba(var(--app-brand-rgb), 0.08);
  color: var(--app-brand);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ---------------------------------------------------------------
   Body: meta row + action pair pinned to the card bottom.
   --------------------------------------------------------------- */
.cc-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1.1rem 1.1rem;
}

.cc-date {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.cc-tools {
  margin-left: auto;
}

/* Square 44px icon buttons (§10 — touch targets). */
.cc-icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
}

.cc-cta {
  min-height: 44px;
}

.cc-icon {
  width: 1.05em;
  height: 1.05em;
  flex: 0 0 auto;
}

/* P10 / §8.4 — remove non-essential motion. */
@media (prefers-reduced-motion: reduce) {
  .collection-card,
  .collection-card:hover,
  .collection-card:focus-within {
    transform: none;
    transition: none;
  }
}
</style>