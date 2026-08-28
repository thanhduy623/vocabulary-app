// Route table (docs/architecture.md §6).
// Views are lazy-loaded so the initial bundle stays small.

export const ROUTE_NAMES = {
  home: 'home',
  wordManagement: 'word-management',
  wordSelection: 'word-selection',
  skillSelection: 'skill-selection',
  skillOptions: 'skill-options',
  learning: 'learning',
  notFound: 'not-found',
}

export const routes = [
  {
    path: '/',
    name: ROUTE_NAMES.home,
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/collection/:collectionId/words',
    name: ROUTE_NAMES.wordManagement,
    component: () => import('@/views/WordManagementView.vue'),
    meta: { title: 'Word Management', requiresCollection: true },
  },
  {
    path: '/learn/select-words',
    name: ROUTE_NAMES.wordSelection,
    component: () => import('@/views/WordSelectionView.vue'),
    meta: { title: 'Select Words', requiresCollection: true },
  },
  {
    path: '/learn/select-skills',
    name: ROUTE_NAMES.skillSelection,
    component: () => import('@/views/SkillSelectionView.vue'),
    meta: { title: 'Select Skills', requiresCollection: true, requiresWords: true },
  },
  {
    path: '/learn/select-options',
    name: ROUTE_NAMES.skillOptions,
    component: () => import('@/views/SkillOptionsView.vue'),
    meta: {
      title: 'Skill Options',
      requiresCollection: true,
      requiresWords: true,
      requiresSkills: true,
    },
  },
  {
    path: '/learn/:skillId',
    name: ROUTE_NAMES.learning,
    component: () => import('@/views/LearningView.vue'),
    meta: { title: 'Learning', requiresSession: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not Found' },
  },
]