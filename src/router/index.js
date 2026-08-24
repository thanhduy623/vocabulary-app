// Router instance + skeleton guard (docs/architecture.md §6).
// Guards are intentionally permissive: they redirect to the earliest screen
// with a missing precondition and keep stores intact (no lost work).

import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useLearningStore } from '@/stores/learningStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const learningStore = useLearningStore()

  // Document titles
  if (to.meta?.title) {
    document.title = `${to.meta.title} · Vocab App`
  } else {
    document.title = 'Vocab App'
  }

  // Precondition guards (minimal skeleton; expands with phases)
  // Word management supports deep-linking via :collectionId param.
  const deepLinkToWords =
    to.name === 'word-management' && Boolean(to.params?.collectionId)

  if (to.meta?.requiresCollection && !deepLinkToWords && !learningStore.selectedCollectionId) {
    return { name: 'home' }
  }
  if (to.meta?.requiresWords && !learningStore.canProceedToSkills) {
    return { name: 'word-selection' }
  }
  if (to.meta?.requiresSession && !learningStore.learningSession) {
    return { name: 'skill-selection' }
  }

  return true
})

export default router