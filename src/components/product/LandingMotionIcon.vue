<template>
  <span class="principle-motion-icon" aria-hidden="true">
    <AppIcon v-show="!ready" :name="name" :size="24" />
    <span ref="animation" class="principle-animation" />
  </span>
</template>

<script>
const icons = {
  file: {
    lines: [
      [[14, 2], [5, 2], [5, 22], [19, 22], [19, 7], [14, 2], [14, 7], [19, 7]],
      [[8, 12], [16, 12]],
      [[8, 16], [14, 16]],
    ],
    delay: 0,
  },
  graph: {
    lines: [[[11, 6], [5, 17], [19, 17], [13, 6]]],
    dots: [[12, 4], [4, 19], [20, 19]],
    delay: 5,
  },
  calendar: {
    lines: [
      [[4, 5], [20, 5], [20, 21], [4, 21], [4, 5]],
      [[8, 2], [8, 8]],
      [[16, 2], [16, 8]],
      [[4, 10], [20, 10]],
      [[8, 15], [11, 18], [16, 13]],
    ],
    delay: 10,
  },
};

function key(value) {
  return { a: 0, k: value };
}

function animationData(name) {
  const { lines, dots = [], delay } = icons[name];
  const paths = lines.map(vertices => ({
    ty: "sh",
    ks: key({ v: vertices, i: vertices.map(() => [0, 0]), o: vertices.map(() => [0, 0]), c: false }),
  }));
  const circles = dots.map(center => ({ ty: "el", p: key(center), s: key([4, 4]), d: 1 }));
  return {
    v: "5.13.0", fr: 60, ip: 0, op: 68, w: 24, h: 24, assets: [],
    layers: [{
      ty: 4, ind: 1, ip: 0, op: 68, st: 0, sr: 1, ao: 0,
      ks: { o: key(100), r: key(0), p: key([0, 0, 0]), a: key([0, 0, 0]), s: key([100, 100, 100]) },
      shapes: [
        ...paths, ...circles,
        { ty: "st", c: key([0.40, 0.73, 0.84, 1]), o: key(100), w: key(1.6), lc: 2, lj: 2 },
        {
          ty: "tm", s: key(0), o: key(0), m: 2,
          e: { a: 1, k: [
            { t: 0, s: [18], h: 1 },
            { t: delay + 1, s: [18], o: { x: [0.22], y: [1] }, i: { x: [0.36], y: [1] } },
            { t: delay + 45, s: [100] },
          ] },
        },
      ],
    }],
  };
}

export default {
  name: "LandingMotionIcon",
  props: {
    name: { type: String, required: true },
    enabled: Boolean,
  },
  data: () => ({ ready: false, visible: false }),
  mounted() {
    if (!("IntersectionObserver" in window)) return;
    this._observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.sync();
    }, { threshold: 0.35 });
    this._observer.observe(this.$el);
  },
  watch: {
    enabled(value) {
      if (value) this.sync();
      else this.clearAnimation();
    },
  },
  beforeDestroy() {
    this._observer?.disconnect();
    this.clearAnimation();
  },
  methods: {
    async sync() {
      if (!this.enabled || !this.visible) {
        this._animation?.pause();
        return;
      }
      if (this._animation) {
        if (this.ready && !this._finished) this._animation.play();
        return;
      }
      if (this._loading) return;
      this._loading = true;
      try {
        const { default: lottie } = await import("lottie-web/build/player/lottie_light");
        if (this._isDestroyed || !this.enabled || !this.visible) return;
        const animation = lottie.loadAnimation({
          container: this.$refs.animation,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: animationData(this.name),
        });
        this._animation = animation;
        animation.addEventListener("DOMLoaded", () => {
          this.ready = true;
          this.sync();
        });
        animation.addEventListener("complete", () => { this._finished = true; });
        animation.addEventListener("error", this.clearAnimation);
      } catch (_) {
        this.clearAnimation();
      } finally {
        this._loading = false;
      }
    },
    clearAnimation() {
      this._animation?.destroy();
      this._animation = null;
      this._finished = false;
      this.ready = false;
    },
  },
};
</script>

<style lang="less" scoped>
.principle-motion-icon {
  position: relative;
  flex: 0 0 24px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: #50a5c5;
}

.principle-motion-icon > .principle-animation {
  position: absolute;
  inset: 0;
}
</style>
