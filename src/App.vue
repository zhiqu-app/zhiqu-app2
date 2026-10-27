<template>
  <div id="zhixu" :class="{ 'reduce-motion': state.settings.reducedMotion }">
    <transition
      name="public-page"
      mode="out-in"
      :css="allowMotion"
      @after-enter="publicReady"
    >
      <router-view
        :key="viewKey"
        :data-route-path="$route.fullPath"
        :inert="blockPublic ? '' : null"
      />
    </transition>
    <NavigationFeedback />
    <transition name="toast"
      ><div v-if="state.toast" class="toast-message" role="status">
        <AppIcon name="info" />{{ state.toast }}
      </div>
    </transition>
  </div>
</template>
<script>
import { state } from "./store";
import NavigationFeedback from "./components/NavigationFeedback.vue";
import { motionAllowed, finishReveals } from "./utils/motion";
import { navigation, revealPage } from "./utils/navigation";
export default {
  name: "App",
  components: { NavigationFeedback },
  data: () => ({ state }),
  computed: {
    blockPublic() {
      return (
        navigation.overlayScope === "full" &&
        (navigation.overlayVisible || navigation.overlayLeaving)
      );
    },
    allowMotion() {
      return motionAllowed();
    },
    viewKey() {
      if (this.$route.meta.product) return "product-experience";
      return this.$route.matched.some((route) => route.meta.workspace)
        ? "workspace"
        : this.$route.path;
    },
  },
  watch: {
    allowMotion(allowed) {
      if (!allowed) finishReveals();
    },
  },
  methods: {
    publicReady(element) {
      revealPage(element.dataset.routePath, "public");
    },
  },
};
</script>

<style lang="less" scoped>
@import "./styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.toast-message {
  position: fixed;
  z-index: 100;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  align-items: center;
  background: #133c57f5;
  border: 1px solid #3588b2;
  box-shadow: 0 8px 40px #0007;
  border-radius: 9px;
  padding: 13px 22px;
  max-width: min(560px, 90vw);
  width: max-content;
  font-size: 14px;
  .app-icon {
    color: @cyan;
  }
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}
.toast-enter,
.toast-leave-to {
  opacity: 0;
}
@media (max-width: 767px) {
  .toast-message {
    bottom: calc(88px + env(safe-area-inset-bottom));
    font-size: 12px;
    padding: 12px 15px;
  }
}
.public-page-enter-active {
  transition:
    opacity 0.28s ease-out,
    transform 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
}
.public-page-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
  pointer-events: none;
}
.public-page-enter,
.public-page-leave-to {
  opacity: 0;
}
</style>
