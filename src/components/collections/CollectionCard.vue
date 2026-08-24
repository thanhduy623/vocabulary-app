<script setup>
defineProps({
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
</script>

<template>
  <div class="card h-100 collection-card">
    <div class="card-body d-flex flex-column">
      <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
        <h2 class="h5 card-title mb-0 text-truncate">
          {{ collection.name }}
        </h2>
        <span class="badge text-bg-light">{{ collection.symbol }}</span>
      </div>
      <p class="card-text small text-muted mb-2">
        {{ collection.language }}
      </p>

      <div class="mt-auto d-grid gap-2">
        <div class="btn-group d-flex" role="group" aria-label="Collection actions">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="busy"
            @click="$emit('learn', collection.id)"
          >
            HỌC NGAY
          </button>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="busy"
            @click="$emit('words', collection.id)"
          >
            TỪ VỰNG
          </button>
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm flex-fill"
            :disabled="busy"
            @click="$emit('edit', collection.id)"
          >
            Cập nhật
          </button>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm flex-fill"
            :disabled="busy"
            @click="$emit('delete', collection.id)"
          >
            Xoá
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-card {
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}
.collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>