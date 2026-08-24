<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="not-found-view text-center py-5">
    <p class="display-1 text-muted mb-2">404</p>
    <h1 class="h4 mb-3">Trang không tồn tại</h1>
    <button type="button" class="btn btn-primary" @click="goHome">
      Về trang chủ
    </button>
  </section>
</template>