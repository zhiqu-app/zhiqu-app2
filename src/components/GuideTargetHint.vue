<template>
  <span class="guide-target-anchor">
    <transition name="guide-hint" :css="animate">
      <span v-if="position" :key="step" class="guide-target-hint" :class="{ below: position.below }"
        :style="{ left: position.x + 'px', top: position.y + 'px', '--tip-x': position.tip + 'px' }" role="status">
        {{ hints[step] }}
      </span>
    </transition>
  </span>
</template>

<script>
import { motionAllowed } from "../utils/motion";

const HINTS = {
  course: "点这里新建一门课程",
  material: "点这里导入课程讲义",
  answer: "在这里输入关于讲义的问题",
  source: "点这里查看回答引用的原文",
};

export default {
  name: "GuideTargetHint",
  props: { step: String, request: Number, blocked: Boolean },
  data: () => ({ hints: HINTS, position: null }),
  computed: { animate() { return motionAllowed(); } },
  watch: {
    step() { this.position = null; this.queue(); },
    request() { this.pendingFocus = this.step; this.queue(); },
    blocked: "queue",
    "$route.fullPath": "queue",
  },
  mounted() {
    window.addEventListener("resize", this.queue);
    document.addEventListener("scroll", this.queue, { capture: true, passive: true });
    this.observer = new MutationObserver(this.queue);
    this.observer.observe(this.$el.parentElement, { childList: true, subtree: true });
    if (window.ResizeObserver) this.resizeObserver = new ResizeObserver(this.queue);
    this.queue();
  },
  beforeDestroy() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.queue);
    document.removeEventListener("scroll", this.queue, true);
  },
  methods: {
    queue() {
      if (!this.step || this.blocked) {
        this.position = null;
        return;
      }
      if (!this.frame) this.frame = requestAnimationFrame(this.measure);
    },
    measure() {
      this.frame = 0;
      const workspace = this.$el.parentElement;
      if (!this.hints[this.step] || this.blocked || workspace.querySelector("#workspace-guide-panel")) {
        this.position = null;
        return;
      }
      const target = workspace.querySelector(`main [data-guide-target="${this.step}"]`);
      if (this.target !== target) {
        this.resizeObserver?.disconnect();
        if (target) this.resizeObserver?.observe(target);
        this.target = target;
      }
      if (!target) {
        this.position = null;
        return;
      }
      const rect = target.getBoundingClientRect();
      const nav = workspace.querySelector(".mobile-nav")?.getBoundingClientRect();
      const floor = nav?.height ? nav.top : window.innerHeight;
      if (this.pendingFocus === this.step) {
        this.pendingFocus = "";
        if (rect.top < 64 || rect.bottom > floor - 10)
          target.scrollIntoView({ block: "center", behavior: this.animate ? "smooth" : "instant" });
      }
      if (!rect.width || rect.top >= floor - 15 || rect.bottom <= 12) {
        this.position = null;
        return;
      }
      if (this.pulsedTarget !== target) {
        this.pulsedTarget = target;
        if (this.animate) target.animate?.([{ outlineOffset: "8px" }, { outlineOffset: "3px" }], { duration: 260 });
      }
      const width = Math.min(218, document.documentElement.clientWidth - 24);
      const center = rect.left + rect.width / 2;
      const x = Math.round(Math.max(12, Math.min(center - width / 2, document.documentElement.clientWidth - width - 12)));
      const below = rect.top < 64 && rect.bottom + 56 < floor;
      const next = { x, y: Math.round(below ? rect.bottom + 9 : Math.max(12, rect.top - 9)), below,
        tip: Math.round(Math.max(12, Math.min(center - x, width - 12))) };
      const old = this.position;
      if (!old || old.x !== next.x || old.y !== next.y || old.below !== next.below || old.tip !== next.tip)
        this.position = next;
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.guide-target-hint {
  position: fixed;
  z-index: 42;
  width: min(218px, calc(100vw - 24px));
  padding: 8px 10px;
  transform: translateY(-100%);
  background: #133043;
  color: #fff1d4;
  border: 1px solid #bc9357;
  border-radius: 8px;
  box-shadow: 0 5px 18px #020b19a6;
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
  pointer-events: none;
  &::after {
    position: absolute;
    left: var(--tip-x);
    bottom: -4px;
    width: 6px;
    height: 6px;
    content: "";
    background: inherit;
    border-right: 1px solid #bc9357;
    border-bottom: 1px solid #bc9357;
    transform: translateX(-50%) rotate(45deg);
  }
  &.below {
    transform: none;
    &::after { top: -4px; bottom: auto; transform: translateX(-50%) rotate(225deg); }
  }
}
.guide-hint-enter-active, .guide-hint-leave-active { transition: opacity .18s ease; }
.guide-hint-enter, .guide-hint-leave-to { opacity: 0; }
</style>
