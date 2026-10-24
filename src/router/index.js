import Vue from 'vue'
import Router from 'vue-router'
import { state } from '../store'
import Landing from '../views/Landing.vue'
import Workspace from '../layouts/Workspace.vue'
import Splash from '../views/Splash.vue'
import Login from '../views/Login.vue'
import {
  beginNavigation,
  completeNavigation,
  coverBeforeCommit,
  navigation,
  lazyPage
} from '../utils/navigation'
Vue.use(Router)
const router = new Router({
  mode: 'hash',
  scrollBehavior: () => ({ x: 0, y: 0 }),
  routes: [
    { path: '/', component: Splash },
    { path: '/welcome', component: Landing },
    { path: '/login', component: Login },
    {
      path: '/app',
      component: Workspace,
      meta: { workspace: true },
      children: [
        { path: '', redirect: 'overview' },
        {
          path: 'overview',
          name: 'overview',
          component: lazyPage(() => import('../views/Overview.vue')),
          meta: { title: '学习总览' }
        },
        {
          path: 'courses',
          name: 'courses',
          component: lazyPage(() => import('../views/Courses.vue')),
          meta: { title: '我的课程' }
        },
        {
          path: 'courses/:id',
          name: 'course',
          component: lazyPage(() => import('../views/CourseDetail.vue')),
          meta: { title: '课程与资料' }
        },
        {
          path: 'studio',
          name: 'studio',
          component: lazyPage(() => import('../views/Studio.vue')),
          meta: { title: 'AI 研习室' }
        },
        {
          path: 'knowledge',
          name: 'knowledge',
          component: lazyPage(() => import('../views/Knowledge.vue')),
          meta: { title: '知识路线' }
        },
        {
          path: 'practice',
          name: 'practice',
          component: lazyPage(() => import('../views/Practice.vue')),
          meta: { title: '练习作答' }
        },
        {
          path: 'mistakes',
          name: 'mistakes',
          component: lazyPage(() => import('../views/Mistakes.vue')),
          meta: { title: '错题本' }
        },
        {
          path: 'reports',
          name: 'reports',
          component: lazyPage(() => import('../views/Reports.vue')),
          meta: { title: '学习报告' }
        },
        {
          path: 'plan',
          name: 'plan',
          component: lazyPage(() => import('../views/Plan.vue')),
          meta: { title: '复习计划' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: lazyPage(() => import('../views/Settings.vue')),
          meta: { title: '个人与设置' }
        }
      ]
    },
    { path: '*', redirect: '/welcome' }
  ]
})
router.beforeEach((to, from, next) => {
  if (to.matched.some((r) => r.meta.workspace) && !state.session)
    next({ path: '/login', query: { redirect: to.fullPath } })
  else {
    beginNavigation(to, from)
    next()
  }
})
router.beforeResolve(async (to, from, next) => {
  const current = await coverBeforeCommit(navigation.revision)
  if (current) next()
  else next(false)
})
router.afterEach((to) => {
  document.title = `${to.meta.title || 'AI 学习空间'} · 知序`
  completeNavigation(to)
})
// 模块加载失败已在 lazyPage 中显示可重试提示，避免额外弹出无操作入口的错误。
router.onError(() => {})
export default router
