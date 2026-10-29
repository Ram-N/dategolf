import { createRouter, createWebHistory } from 'vue-router'
import DailyChallengeView from '../views/DailyChallengeView.vue'
import DatePickView from '../views/DatePickView.vue'
import CreatorView from '../views/CreatorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        return window.location.hostname.startsWith('datepick.') ? '/datepick' : '/dategolf'
      },
    },
    {
      path: '/dategolf',
      name: 'daily',
      component: DailyChallengeView,
      meta: { title: 'DateGolf — Daily History Golf' },
    },
    {
      path: '/datepick',
      name: 'datepick',
      component: DatePickView,
      meta: { title: 'DatePick' },
    },
    {
      path: '/creator',
      name: 'creator',
      component: CreatorView,
    },
  ],
})

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title as string
})

export default router
