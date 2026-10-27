<template>
  <div class="intro-slide" @touchstart.stop @touchend.stop>
    <div
      ref="track"
      class="intro-slide-track"
      :class="{ 'is-dragging': dragging }"
      :data-progress="Math.round(progress * 100)">
      <div
        class="intro-slide-fill"
        :style="{ width: `${progress * 100}%` }"
        aria-hidden="true"/>
      <span class="intro-slide-label" :style="{ opacity: 1 - progress }">向右滑动，进入知序</span>
      <span class="intro-slide-destination" aria-hidden="true">»</span>
      <button
        ref="thumb"
        class="intro-slide-thumb"
        type="button"
        aria-label="进入知序"
        :style="{ transform: `translateX(${offset}px)` }"
        @pointerdown="start"
        @pointermove="move"
        @pointerup="end"
        @pointercancel="cancel"
        @lostpointercapture="cancel"
        @click="click"
      >
        <AppIcon name="arrow" :size="22" />
      </button>
    </div>
    <span class="intro-slide-hint">拖动箭头或者滚动，进入产品首页</span>
  </div>
</template>
<script>
import { gsap } from "gsap";
import { motionAllowed } from "../../utils/motion";
export default {
  name: "IntroSlideButton",
  data: () => ({ offset: 0, travel: 1, dragging: false, completed: false }),
  computed: {
    progress() {
      return Math.min(1, this.offset / this.travel);
    },
  },
  mounted() {
    this.measure();
    window.addEventListener("resize", this.cancel);
  },
  beforeDestroy() {
    this.dragging = false;
    this.release();
    this._snap?.kill();
    window.removeEventListener("resize", this.cancel);
  },
  methods: {
    focus() {
      this.$refs.thumb?.focus({ preventScroll: true });
    },
    measure() {
      this.travel = Math.max(
        1,
        this.$refs.track.clientWidth - this.$refs.thumb.offsetWidth - 12,
      );
    },
    start(e) {
      if (e.button !== 0 || !e.isPrimary || this.completed) return;
      this._snap?.kill();
      this.measure();
      this._start = e.clientX - this.offset;
      this._pointer = e.pointerId;
      this._moved = false;
      this._suppressClick = false;
      this.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    move(e) {
      if (!this.dragging || e.pointerId !== this._pointer) return;
      const distance = e.clientX - this._start;
      if (Math.abs(distance - this.offset) > 4 || distance > 5)
        this._moved = true;
      this.offset = Math.max(0, Math.min(this.travel, distance));
    },
    end(e) {
      if (!this.dragging || e.pointerId !== this._pointer) return;
      this.dragging = false;
      this._suppressClick = this._moved;
      this.release();
      if (this._moved && this.progress >= 0.82) this.complete();
      else this.snapBack();
    },
    release() {
      if (
        this._pointer != null &&
        this.$refs.thumb?.hasPointerCapture(this._pointer)
      )
        this.$refs.thumb.releasePointerCapture(this._pointer);
      this._pointer = null;
    },
    cancel() {
      if (!this.dragging) return;
      this.dragging = false;
      this._suppressClick = true;
      this.release();
      this.snapBack();
    },
    snapBack() {
      this._snap?.kill();
      this._snap = gsap.to(this, {
        offset: 0,
        duration: motionAllowed() ? 0.28 : 0,
        ease: "power3.out",
      });
    },
    click(e) {
      // Pointer Events 后浏览器仍可能派发 click；短拖动不能误触进入。键盘 click 的 detail 为 0。
      if (this._suppressClick && e.detail !== 0) {
        this._suppressClick = false;
        return;
      }
      this.complete();
    },
    complete() {
      if (this.completed) return;
      this.completed = true;
      this._snap?.kill();
      this.offset = this.travel;
      this.$emit("complete");
    },
  },
};
</script>
<style lang="less" scoped>
.intro-slide {
  width: min(286px, calc(100vw - 48px));
  text-align: center;
}
.intro-slide-track {
  position: relative;
  height: 58px;
  border: 1px solid #316f88;
  border-radius: 40px;
  background: #0a2b40;
  overflow: hidden;
  user-select: none;
}
.intro-slide-label {
  position: absolute;
  inset: 0 25px 0 48px;
  display: grid;
  place-items: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: #b7d6e5;
  pointer-events: none;
}
.intro-slide-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #1e6575, #3594a6);
  pointer-events: none;
}
.intro-slide-destination {
  position: absolute;
  right: 16px;
  top: 15px;
  font-size: 20px;
  color: #5c9aaf;
}
.intro-slide-thumb {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #75deee;
  color: #052b3b;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 0 22px #5ed5e526;
  &:focus-visible {
    outline: 2px solid #e5faff;
    outline-offset: -4px;
  }
}
.is-dragging .intro-slide-thumb {
  cursor: grabbing;
}
.intro-slide-hint {
  display: block;
  margin-top: 10px;
  color: #759db5;
  font-size: 9px;
  letter-spacing: 0.5px;
}
@media (max-height: 560px) and (min-width: 600px) {
  .intro-slide-track {
    height: 52px;
  }
  .intro-slide-thumb {
    width: 38px;
    height: 38px;
  }
  .intro-slide-hint {
    font-size: 8px;
  }
}
</style>
