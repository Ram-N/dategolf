import { createRouter, createWebHistory } from 'vue-router'
import DailyChallengeView from '../views/DailyChallengeView.vue'
import DatePickView from '../views/DatePickView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/datepick',
    },
    {
      path: '/dategolf',
      name: 'daily',
      component: DailyChallengeView,
    },
    {
      path: '/datepick',
      name: 'datepick',
      component: DatePickView,
    },
  ],
})

export default router
