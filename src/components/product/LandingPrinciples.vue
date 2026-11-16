<template>
  <section id="product-principles" class="product-principles" aria-label="学习方式" tabindex="-1"
    :class="{ 'is-animated': animated, 'is-entered': entered, 'is-ready': linesReady, 'is-paused': paused || !inView }">
    <span class="principles-line line-top" aria-hidden="true" />
    <span class="principles-line line-bottom" aria-hidden="true" @animationend="linesReady = true" />
    <div class="principles-content">
      <p class="principles-intro">让每一次学习，<br /><strong>有依据，也有方向。</strong></p>
      <div class="principles-window">
        <div class="principles-track">
          <div v-for="copy in animated ? 2 : 1" :key="copy" class="principles-copy"
            :aria-hidden="copy === 2 ? 'true' : null">
            <div v-for="item in items" :key="item.icon" class="principles-item">
              <LandingMotionIcon :name="item.icon" :enabled="animated && linesReady" />
              <span>{{ item.title }}<small>{{ item.note }}</small></span>
            </div>
          </div>
        </div>
      </div>
      <button v-if="animated && linesReady" type="button" class="principles-pause"
        :aria-label="paused ? '继续滚动' : '暂停滚动'" :title="paused ? '继续滚动' : '暂停滚动'"
        @click="paused = !paused">
        <AppIcon v-if="paused" name="play" :size="15" />
        <span v-else class="pause-mark" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<script>
import LandingMotionIcon from "./LandingMotionIcon.vue";

const items = [
  { icon: "file", title: "课程资料", note: "讲义、笔记，各自归位" },
  { icon: "graph", title: "自己的连接", note: "知识点与顺序，由你决定" },
  { icon: "calendar", title: "持续的积累", note: "练习、错题，连接复习" },
];
const revealThreshold = 0.55;

export default {
  name: "LandingPrinciples",
  components: { LandingMotionIcon },
  props: { animated: Boolean },
  data: () => ({ items, inView: false, entered: false, linesReady: false, paused: false }),
  watch: {
    animated(enabled) {
      this.entered = enabled && this.inView;
      this.linesReady = false;
    },
  },
  mounted() {
    if (!("IntersectionObserver" in window)) {
      this.inView = true;
      this.entered = this.animated;
      return;
    }
    this._observer = new IntersectionObserver(([entry]) => {
      this.inView = entry.intersectionRatio >= revealThreshold;
      if (this.animated && this.inView) this.entered = true;
    }, { threshold: revealThreshold });
    this._observer.observe(this.$el);
  },
  beforeDestroy() {
    this._observer?.disconnect();
  },
};
</script>

<style lang="less" scoped>
.product-principles {
  position: relative;
  max-width: 1280px;
  margin: auto;
  scroll-margin-top: 50px;
}

.principles-line {
  position: absolute;
  inset-inline: 0;
  height: 1px;
  background: #173548;
  pointer-events: none;
}

.line-top { top: 0; transform-origin: left center; }
.line-bottom { bottom: 0; transform-origin: right center; }

.principles-content {
  display: grid;
  grid-template-columns: clamp(146px, 20%, 248px) minmax(0, 1fr);
  align-items: center;
}

.principles-intro {
  margin: 0;
  padding-left: 44px;
  color: #7ba8bd;
  font-size: 12px;
  line-height: 1.8;

  strong { color: #c6dfeb; font-weight: 400; }
}

.principles-copy {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 24px;
  padding: 32px 24px;
}

.principles-item {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #b5d3e2;
  font-size: 12px;

  small {
    display: block;
    margin-top: 4px;
    color: #81a5bb;
    font-size: 10px;
  }
}

.is-animated {
  .principles-line {
    transform: scaleX(0);
    background: linear-gradient(90deg, #24506a, #4daac3 50%, #24506a);
  }

  .principles-content {
    grid-template-columns: clamp(146px, 20%, 248px) minmax(0, 1fr) 52px;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.55s ease-out, transform 0.55s ease-out;
  }

  .principles-window {
    overflow: hidden;
    mask-image: linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 18px), transparent);
  }

  .principles-track {
    display: flex;
    width: max-content;
    min-width: 200%;
  }

  // 两份内容宽度相同，移动半条轨道后第二份接替第一份。
  .principles-copy {
    flex: 1 0 auto;
    grid-template-columns: repeat(3, minmax(192px, 1fr));
    white-space: nowrap;
  }

  &.is-entered .principles-line { animation: principles-draw 1.08s cubic-bezier(0.22, 1, 0.36, 1) both; }
  &.is-entered .line-bottom { animation-delay: 0.32s; }

  &.is-ready {
    .principles-content { opacity: 1; transform: translateY(0); }
    .principles-track { animation: principles-loop 36s linear infinite; }
  }

  &.is-ready.is-paused .principles-track { animation-play-state: paused; }
}

.principles-pause {
  display: grid;
  place-items: center;
  width: 42px;
  height: 44px;
  justify-self: center;
  border-radius: 6px;
  color: #88ccdf;

  &:hover, &:focus-visible { color: #d6f6ff; background: #102e42; }
}

.pause-mark {
  width: 9px;
  height: 13px;
  border-inline: 2px solid currentColor;
}

@keyframes principles-draw {
  to { transform: scaleX(1); }
}

@keyframes principles-loop {
  to { transform: translateX(-50%); }
}

@media (hover: hover) {
  .is-animated.is-ready .principles-window:hover .principles-track { animation-play-state: paused; }
}

@media (max-width: 767px) {
  .principles-content { grid-template-columns: minmax(0, 1fr); }
  .is-animated .principles-content { grid-template-columns: minmax(0, 1fr) 52px; }

  .principles-intro {
    grid-column: 1 / -1;
    padding: 18px 24px 0;
  }

  .principles-copy {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 18px 24px 22px;
  }

  .is-animated.is-ready .principles-track { animation-duration: 28s; }
}
</style>
