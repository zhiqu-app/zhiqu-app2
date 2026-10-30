<template>
  <div class="navigation-feedback" :class="{ 'navigation-reduced': !allowMotion }">
    <transition name="navigation-bar">
      <div v-if="navigation.barVisible" class="navigation-progress" :class="{ complete: navigation.completed }"
        aria-hidden="true">
        <i />
      </div>
    </transition>
    <transition name="loading-page" :css="allowMotion" @after-leave="finishOverlayLeave">
      <section v-if="navigation.overlayVisible" class="route-loading-page"
        :class="'loading-scope-' + navigation.overlayScope" role="status" aria-live="polite"
        :aria-label="'正在进入' + navigation.title">
        <div class="loading-page-grid" aria-hidden="true" />
        <div class="loading-page-content">
          <div class="page-orbit" aria-hidden="true">
            <span class="orbit-track orbit-one" />
            <span class="orbit-track orbit-two" /><span class="orbit-track orbit-three" />
            <div class="page-orbit-book">
              <AppIcon name="book" :size="50" />
            </div>
            <i class="orbit-satellite" />
          </div>
          <span class="loading-page-eyebrow">知序 · 学习空间</span>
          <h2>{{ navigation.pending ? '正在进入' : '即将呈现' }}{{ navigation.title }}</h2>
          <p>{{ navigation.pending ? '正在准备页面资源，请稍候' : '页面已就绪，正在平滑切换' }}</p>
          <div class="page-loading-line" aria-hidden="true">
            <i :class="{ ready: navigation.completed }" />
          </div>
          <div class="loading-page-state">
            <span class="dot cyan" />
            <span>{{
              navigation.pending ? '加载页面资源' : '展开页面内容'
            }}</span>
            <span class="loading-dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      </section>
    </transition>
    <div v-if="navigation.error" class="navigation-error" role="alert">
      <AppIcon name="info" /><span>{{ navigation.error }}</span>
      <button class="text-button" @click="retry">重试</button>
      <button class="icon-button" aria-label="关闭加载错误提示" @click="navigation.error = ''">
        <AppIcon name="close" :size="18" />
      </button>
    </div>
  </div>
</template>
<script>
import { navigation, finishOverlayLeave } from '../utils/navigation'
import { motionAllowed } from '../utils/motion'
export default {
  name: 'NavigationFeedback',
  data: () => ({ navigation }),
  computed: {
    allowMotion() {
      return motionAllowed()
    }
  },
  methods: {
    finishOverlayLeave,
    retry() {
      window.location.hash = navigation.target
      window.location.reload()
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.navigation-progress {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  overflow: hidden;
  background: #071a2e;
  pointer-events: none;

  >i {
    display: block;
    position: absolute;
    width: 35%;
    height: 100%;
    background: linear-gradient(90deg, transparent, @cyan, #8beaff);
    box-shadow: 0 0 12px @cyan;
    animation: navigation-sweep 1.15s ease-in-out infinite;
  }

  &.complete>i {
    animation: none;
    width: 100%;
    transform: none;
    background: @cyan;
    transition: width 0.16s ease;
  }
}

.navigation-bar-leave-active {
  transition: opacity 0.22s;
}

.navigation-bar-leave-to {
  opacity: 0;
}

@keyframes navigation-sweep {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(390%);
  }
}

.loading-dots {
  display: flex;
  gap: 4px;
  margin-left: 8px;

  i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: @cyan;
    animation: loading-dot 1s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.14s;
    }

    &:nth-child(3) {
      animation-delay: 0.28s;
    }
  }
}

@keyframes loading-dot {

  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

.navigation-error {
  position: fixed;
  top: 82px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 16px;
  max-width: calc(100vw - 28px);
  width: max-content;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #322230f5;
  border: 1px solid #9b5265;
  border-radius: 8px;
  box-shadow: 0 8px 30px #0006;
  font-size: 13px;

  .app-icon {
    color: #ffb9ba;
  }

  .text-button {
    white-space: nowrap;
  }

  .icon-button {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 767px) {
  .navigation-error {
    top: 74px;
    font-size: 12px;
    gap: 8px;
  }
}

.navigation-reduced .navigation-progress>i {
  animation: none !important;
  width: 100%;
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .navigation-progress>i {
    animation: none !important;
    width: 100%;
    opacity: 0.7;
  }
}

.navigation-feedback {
  position: static;
  z-index: auto;
}

.navigation-progress {
  z-index: 95;
}

.navigation-error {
  z-index: 96;
}

.route-loading-page {
  position: fixed;
  inset: 0;
  z-index: 70;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 42%, #0c3150 0%, #061b2e 46%, #041524 78%);
  color: @text;
  pointer-events: auto;
  isolation: isolate;

  &.loading-scope-workspace {
    left: 236px;
    top: 64px;
    z-index: 30;
  }
}

.loading-page-grid {
  position: absolute;
  inset: 0;
  opacity: 0.13;
  background-image:
    linear-gradient(#2c7499 1px, transparent 1px),
    linear-gradient(90deg, #2c7499 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse, black, transparent 65%);
  transform: perspective(700px) rotateX(20deg) scale(1.2);
  z-index: -1;
}

.loading-page-content {
  width: min(500px, calc(100vw - 56px));
  text-align: center;
  padding: 35px 0;

  h2 {
    margin: 14px 0 12px;
    font-size: clamp(23px, 2.4vw, 32px);
    font-weight: 500;
    letter-spacing: 1px;
  }

  >p {
    color: #8bb7d8;
    font-size: 13px;
    margin-bottom: 28px;
  }
}

.loading-page-eyebrow {
  display: block;
  margin-top: 22px;
  color: #52c7f0;
  font-size: 12px;
  letter-spacing: 3px;
}

.page-orbit {
  position: relative;
  width: 190px;
  height: 190px;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
}

.orbit-track {
  position: absolute;
  border: 1px solid #24658a;
  border-radius: 50%;
  inset: 0;

  &.orbit-one {
    transform: rotateX(62deg) rotate(-25deg);
    border-color: #1aa8d0;
  }

  &.orbit-two {
    inset: 15px;
    border-style: dashed;
    opacity: 0.5;
    animation: orbit-turn 18s linear infinite;
  }

  &.orbit-three {
    inset: 36px;
    box-shadow:
      0 0 25px #00a9ff18,
      inset 0 0 30px #009bff12;
    border-color: #1978a8;
  }
}

.page-orbit-book {
  width: 94px;
  height: 94px;
  display: grid;
  place-items: center;
  color: #53dcff;
  border-radius: 24px;
  border: 1px solid #249ac2;
  background: linear-gradient(140deg, #145077, #0a263e);
  box-shadow:
    0 0 45px #00baff24,
    inset 0 0 26px #008dca17;
  transform: rotate(-8deg);
  animation: book-breathe 2.4s ease-in-out infinite;

  .app-icon {
    filter: drop-shadow(0 0 8px #00bfff60);
  }
}

.orbit-satellite {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8deaff;
  box-shadow: 0 0 14px @cyan;
  top: 92px;
  left: 92px;
  animation: satellite-turn 2.2s linear infinite;
}

.page-loading-line {
  width: 250px;
  max-width: 80%;
  height: 3px;
  border-radius: 3px;
  background: #163d57;
  overflow: hidden;
  margin: 0 auto;
  position: relative;

  >i {
    position: absolute;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, @cyan);
    animation: navigation-sweep 1.2s ease-in-out infinite;

    &.ready {
      animation: none;
      width: 100%;
      background: @cyan;
    }
  }
}

.loading-page-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
  font-size: 11px;
  color: #72aaca;
}

.loading-page-enter-active {
  transition: opacity 0.18s ease-in-out;
}

.loading-page-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.loading-page-enter,
.loading-page-leave-to {
  opacity: 0;
}

@keyframes orbit-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes book-breathe {
  50% {
    transform: rotate(-8deg) translateY(-5px);
    box-shadow: 0 0 60px #00baff30;
  }
}

@keyframes satellite-turn {
  from {
    transform: rotate(0) translateX(92px);
  }

  to {
    transform: rotate(360deg) translateX(92px);
  }
}

@media (min-width: 1200px) and (max-width: 1390px) {
  .route-loading-page.loading-scope-workspace {
    left: 215px;
  }
}

@media (max-width: 1199px) {
  .route-loading-page.loading-scope-workspace {
    left: 0;
  }
}

@media (max-width: 767px) {
  .route-loading-page.loading-scope-workspace {
    top: 58px;
  }

  .page-orbit {
    transform: scale(0.85);
    margin-bottom: 0;
  }

  .loading-page-content {
    h2 {
      font-size: 23px;
    }

    >p {
      font-size: 12px;
    }
  }
}

.navigation-reduced .page-loading-line>i {
  animation: none !important;
  width: 100%;
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .page-loading-line>i {
    animation: none !important;
    width: 100%;
    opacity: 0.6;
  }
}
</style>
