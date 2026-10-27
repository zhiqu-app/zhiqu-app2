import Vue from "vue";
import Router from "vue-router";
import { state } from "../store";
import { restoreSession } from "../services/auth";
import { getToken } from "../services/api";
import Landing from "../views/Landing.vue";
import Workspace from "../layouts/Workspace.vue";
import Splash from "../views/Splash.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import {
  beginNavigation,
  completeNavigation,
  coverBeforeCommit,
  navigation,
  lazyPage,
} from "../utils/navigation";
Vue.use(Router);
const router = new Router({
  mode: "hash",
  scrollBehavior: () => ({ x: 0, y: 0 }),
  routes: [
    { path: "/", component: Splash },
    { path: "/welcome", component: Landing },
    { path: "/login", component: Login, meta: { title: "登录" } },
    { path: "/register", component: Register, meta: { title: "邮箱注册" } },
    {
      path: "/setup-knowledge",
      redirect: "/app/courses",
    },
    {
      path: "/app",
      component: Workspace,
      meta: { workspace: true },
      children: [
        { path: "", redirect: "overview" },
        {
          path: "overview",
          name: "overview",
          component: lazyPage(() => import("../views/Overview.vue")),
          meta: { title: "学习总览" },
        },
        {
          path: "courses",
          name: "courses",
          component: lazyPage(() => import("../views/Courses.vue")),
          meta: { title: "我的课程" },
        },
        {
          path: "courses/:id/questions",
          name: "question-bank",
          component: lazyPage(() => import("../views/QuestionBank.vue")),
          meta: { title: "配置课程题库" },
        },
        {
          path: "courses/:id/knowledge/edit",
          name: "course-knowledge-edit",
          component: lazyPage(
            () => import("../views/CourseKnowledgeEditor.vue"),
          ),
          meta: { title: "配置课程知识星图" },
        },
        {
          path: "courses/:id",
          name: "course",
          component: lazyPage(() => import("../views/CourseDetail.vue")),
          meta: { title: "课程与资料" },
        },
        {
          path: "studio",
          name: "studio",
          component: lazyPage(() => import("../views/Studio.vue")),
          meta: { title: "AI 研习室" },
        },
        {
          path: "knowledge",
          name: "knowledge",
          component: lazyPage(() => import("../views/Knowledge.vue")),
          meta: { title: "知识路线" },
        },
        {
          path: "practice",
          name: "practice",
          component: lazyPage(() => import("../views/Practice.vue")),
          meta: { title: "练习作答" },
        },
        {
          path: "mistakes",
          name: "mistakes",
          component: lazyPage(() => import("../views/Mistakes.vue")),
          meta: { title: "错题本" },
        },
        {
          path: "history",
          name: "history",
          component: lazyPage(() => import("../views/AttemptHistory.vue")),
          meta: { title: "作答历史" },
        },
        {
          path: "reports",
          name: "reports",
          component: lazyPage(() => import("../views/Reports.vue")),
          meta: { title: "学习报告" },
        },
        {
          path: "plan",
          name: "plan",
          component: lazyPage(() => import("../views/Plan.vue")),
          meta: { title: "复习计划" },
        },
        {
          path: "settings",
          name: "settings",
          component: lazyPage(() => import("../views/Settings.vue")),
          meta: { title: "个人与设置" },
        },
      ],
    },
    { path: "*", redirect: "/welcome" },
  ],
});
router.beforeEach(async (to, from, next) => {
  // 星图属于课程，不是登录门槛；这里仅检查会话并保留页面平滑交接。
  beginNavigation(to, from);
  const workspace = to.matched.some((record) => record.meta.workspace);
  if (workspace) {
    if (getToken() || state.mode !== "demo") {
      try {
        const user = await restoreSession();
        if (!user)
          return next({ path: "/login", query: { redirect: to.fullPath } });
      } catch (_) {
        return next({
          path: "/login",
          query: { redirect: to.fullPath, reason: "connection" },
        });
      }
    }
  }
  next();
});
router.beforeResolve(async (to, from, next) => {
  const current = await coverBeforeCommit(navigation.revision);
  if (current) next();
  else next(false);
});
router.afterEach((to) => {
  document.title = `${to.meta.title || "AI 学习空间"} · 知序`;
  completeNavigation(to);
});
// 模块加载失败已在 lazyPage 中显示可重试提示，避免额外弹出无操作入口的错误。
router.onError(() => {});
export default router;
