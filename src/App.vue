<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import ToastStack from '@/components/common/ToastStack.vue'
import ConfirmModalHost from '@/components/common/ConfirmModalHost.vue'
</script>

<template>
  <div class="app-shell d-flex flex-column min-vh-100">
    <AppHeader />

    <!-- Router outlet renders all routed views below the header -->
    <main class="app-main">
      <RouterView />
    </main>

    <!-- Global UI surfaces (toasts, confirmation modal host) -->
    <ToastStack />
    <ConfirmModalHost />
  </div>
</template>
