<script setup>
import { useRouter } from 'vue-router'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { useUiStore } from '@/stores/uiStore'

defineProps({
  title: {
    type: String,
    default: 'Vocab App',
  },
})

const router = useRouter()
const collectionsStore = useCollectionsStore()
const uiStore = useUiStore()

function goHome() {
  router.push({ name: 'home' })
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}

/**
 * Purge all front caches then reload from Firebase (FR-X01, BR-74).
 * The store's refresh() clears both the collection and word caches for us.
 */
async function handleRefresh() {
  if (uiStore.appBusy) return
  uiStore.setAppBusy(true)
  try {
    const res = await collectionsStore.refresh()
    if (!res.ok) {
      uiStore.pushToast('danger', res.error || 'Refresh failed')
    } else {
      uiStore.pushToast('success', 'Data refreshed')
    }
  } finally {
    uiStore.setAppBusy(false)
  }
}
</script>

<template>
  <header class="app-header sticky-top bg-white border-bottom shadow-sm">
    <nav
      class="navbar navbar-expand navbar-light px-3"
      aria-label="Main navigation"
    >
      <div class="container-xxl d-flex align-items-center gap-2 flex-nowrap">
        <!-- Logo → home -->
        <button
          type="button"
          class="btn btn-link navbar-brand fw-bold text-primary p-0 border-0 text-decoration-none"
          @click="goHome"
        >
          Vocab App
        </button>

        <div class="d-flex align-items-center gap-2 ms-auto">
          <!-- Back (state-preserving) -->
          <button
            type="button"
            class="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
            aria-label="Go back"
            @click="goBack"
          >
            <span aria-hidden="true">&larr;</span>
            <span class="d-none d-sm-inline">Back</span>
          </button>

          <!-- Refresh (purge caches + reload) -->
          <button
            type="button"
            class="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
            :disabled="uiStore.appBusy"
            aria-label="Refresh data"
            title="Refresh data from the database"
            @click="handleRefresh"
          >
            <span
              v-if="uiStore.appBusy"
              class="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            />
            <span v-else aria-hidden="true">&#x21bb;</span>
            <span class="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  z-index: 1030; /* keep above bootstrap modal backdrop (1050) as needed */
}
</style>