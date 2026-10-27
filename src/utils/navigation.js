import Vue from "vue";
import { motionAllowed } from "./motion";

// 模块加载与视觉交接分开：遮罩盖好后提交路由，新页面入场后再揭开。
export const navigation = Vue.observable({
  pending: false, // 是否正在跳转中
  barVisible: false, // 顶部进度条是否可见
  completed: false, // 是否跳转完成
  target: "", // 跳转目标网址
  title: "", // 目标页标题
  error: "", //错误信息
  revision: 0, // 版本号（防止旧的异步回调覆盖新路由状态）
  overlayVisible: false, // 页面遮罩是否显示
  overlayScope: "full", // 遮罩范围：full=全屏；workspace=仅工作台内部局部遮罩
  overlayLeaving: false, // 遮罩正在退场动画
  committed: false, // 路由已经提交确认
});
//
let dismissTimer,
  coverStarted = 0,
  readyFallback;

// 路由开始跳转
export function beginNavigation(to, from) {
  // console.log('beginNavigation', to, from)
  clearTimeout(dismissTimer);
  clearTimeout(readyFallback);
  const wasCovered = navigation.overlayVisible && !navigation.overlayLeaving;
  // 开场与产品首页共用场景，由产品页自己的时间线接续；其他路由照常显示加载遮罩。
  const sameProduct = !!(from.meta.product && to.meta.product);
  const changesPage =
    from.matched.length > 0 && to.path !== from.path && !sameProduct;
  const bothInWorkspace = [from, to].every((route) =>
    route.matched.some((record) => record.meta.workspace),
  );
  navigation.revision++;
  navigation.target = to.fullPath;
  navigation.title =
    to.meta.title ||
    { "/": "知序", "/welcome": "产品首页", "/login": "登录知序" }[to.path] ||
    "学习空间";
  navigation.error = "";
  navigation.pending = true;
  navigation.committed = false;
  navigation.completed = false;
  navigation.barVisible = !sameProduct;
  navigation.overlayLeaving = false;
  if (!wasCovered) {
    navigation.overlayScope = bothInWorkspace ? "workspace" : "full";
    coverStarted = performance.now();
  }
  navigation.overlayVisible = !sameProduct && (changesPage || wasCovered);
}

// 跳转之前覆盖页面
export async function coverBeforeCommit(revision) {
  if (navigation.overlayVisible && motionAllowed()) {
    // 200ms 仅是覆盖交接时间，不是伪造资源加载进度。主要为了防止加载动画以删而过，保留一段最小动画时长
    const remaining = Math.max(0, 200 - (performance.now() - coverStarted));
    if (remaining)
      await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  return revision === navigation.revision;
}

function dismissBar(revision) {
  dismissTimer = setTimeout(() => {
    if (revision === navigation.revision) navigation.barVisible = false;
  }, 180);
}

export function completeNavigation(to) {
  if (to.fullPath !== navigation.target) return;
  navigation.pending = false;
  navigation.committed = true;
  navigation.completed = true;
  if (!navigation.overlayVisible) {
    dismissBar(navigation.revision);
    return;
  }
  const revision = navigation.revision;
  // 兜底也要确认目标 DOM 已经存在，不能提前揭开空白区域。
  readyFallback = setTimeout(() => {
    const target = document.querySelector(
      navigation.overlayScope === "workspace"
        ? ".route-page[data-route-path]"
        : "#zhixu > [data-route-path]",
    );
    if (
      revision === navigation.revision &&
      target &&
      target.querySelector("h1") &&
      target.dataset.routePath === navigation.target
    ) {
      revealPage(
        navigation.target,
        navigation.overlayScope === "full" ? "public" : "workspace",
      );
    }
  }, 1200);
}

export function revealPage(path, layer) {
  if (
    !navigation.committed ||
    path !== navigation.target ||
    !navigation.overlayVisible
  )
    return;
  if (navigation.overlayScope === "full" && layer !== "public") return;
  if (navigation.overlayScope === "workspace" && layer !== "workspace") return;
  clearTimeout(readyFallback);
  navigation.overlayVisible = false;
  navigation.overlayLeaving = true;
  dismissBar(navigation.revision);
}

export function finishOverlayLeave() {
  navigation.overlayLeaving = false;
}

export function failNavigation(revision) {
  if (revision !== navigation.revision) return;
  clearTimeout(dismissTimer);
  clearTimeout(readyFallback);
  navigation.pending = false;
  navigation.barVisible = false;
  navigation.overlayVisible = false;
  navigation.error = "页面资源加载失败，请检查网络后重试。";
}

export function lazyPage(load) {
  return () => {
    const revision = navigation.revision;
    return load().catch((error) => {
      failNavigation(revision);
      throw error;
    });
  };
}
