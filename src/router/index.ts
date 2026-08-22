import { createRouter, createWebHistory } from 'vue-router'
import DailyChallengeView from '../views/DailyChallengeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'daily',
      component: DailyChallengeView,
    },
  ],
})

export default router
