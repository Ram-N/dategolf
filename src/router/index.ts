import { createRouter, createWebHistory } from 'vue-router'
import DailyChallengeView from '../views/DailyChallengeView.vue'
import DatePickView from '../views/DatePickView.vue'
import CreatorView from '../views/CreatorView.vue'
import DateFlowView from '../views/DateFlowView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const host = window.location.hostname
        if (host.startsWith('datepick.')) return '/datepick'
        if (host.startsWith('dateflow.')) return '/dateflow'
        return '/dategolf'
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
      path: '/dateflow',
      name: 'dateflow',
      component: DateFlowView,
      meta: { title: 'DateFlow' },
    },
    // DateFlow was called DateRoll until 2026-11-01; keep old links working.
    { path: '/dateroll', redirect: '/dateflow' },
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
