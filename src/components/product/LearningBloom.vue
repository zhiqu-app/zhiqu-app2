<template>
  <div class="learning-bloom" :data-phase="phase" aria-hidden="true">
    <svg viewBox="0 0 100 130" fill="none">
      <g class="bloom-floating">
        <ellipse
          class="bloom-base"
          cx="50"
          cy="115"
          rx="30"
          ry="5"
          fill="#55c4dc"
          fill-opacity=".06"
        />
        <g
          class="bloom-book"
          stroke="#77c8dd"
          stroke-width="1.2"
          stroke-linejoin="round"
        >
          <path
            d="M50 108C40 101 29 102 20 104V86C30 84 40 85 50 92C60 85 70 84 80 86V104C70 102 60 101 50 108Z"
            fill="#0b3044"
          />
          <path
            d="M50 92V108M26 92C32 91 39 93 44 96M56 96C61 93 68 91 74 92"
          />
        </g>
        <g class="bloom-stems" stroke-linecap="round" stroke-width="1.2">
          <path d="M50 90V29" stroke="#62d5e8" />
          <path
            d="M50 73C36 71 30 63 27 52M50 57C63 55 70 46 73 34"
            stroke="#418eab"
          />
          <path d="M50 43C44 41 40 37 38 31" stroke="#c3a77a" />
        </g>
        <g class="bloom-leaves" stroke-width="1.2">
          <path
            d="M27 52C15 49 16 38 16 38C27 38 31 43 27 52Z"
            fill="#153e51"
            stroke="#71c4da"
          />
          <path
            d="M73 34C70 24 78 20 84 19C85 28 81 34 73 34Z"
            fill="#153e51"
            stroke="#71c4da"
          />
          <circle cx="50" cy="26" r="4" fill="#70d8e7" />
          <circle cx="37" cy="29" r="2.5" fill="#d0b58b" />
        </g>
      </g>
    </svg>
  </div>
</template>
<script>
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motionAllowed } from "../../utils/motion";
gsap.registerPlugin(ScrollTrigger);
export default {
  name: "LearningBloom",
  props: { enabled: { type: Boolean, default: true } },
  data: () => ({ phase: "static" }),
  computed: {
    animated() {
      return this.enabled && motionAllowed();
    },
  },
  watch: {
    animated() {
      this.$nextTick(this.setup);
    },
  },
  mounted() {
    this._visibility = () => this.syncPlayback();
    document.addEventListener("visibilitychange", this._visibility);
    this.setup();
  },
  beforeDestroy() {
    this._context?.revert();
    document.removeEventListener("visibilitychange", this._visibility);
  },
  methods: {
    setup() {
      if (this._isDestroyed || this._isBeingDestroyed) return;
      this._context?.revert();
      this._grow = this._float = null;
      this.phase = "static";
      if (!this.animated) return;
      this.phase = "waiting";
      this._visible = false;
      this._context = gsap.context(() => {
        const stems = this.$el.querySelectorAll(".bloom-stems path");
        stems.forEach((p) =>
          gsap.set(p, {
            strokeDasharray: p.getTotalLength(),
            strokeDashoffset: p.getTotalLength(),
          }),
        );
        gsap.set(".bloom-book, .bloom-base", {
          opacity: 0,
          scale: 0.5,
          svgOrigin: "50 110",
        });
        gsap.set(".bloom-leaves > *", {
          opacity: 0,
          scale: 0.2,
          transformOrigin: "50% 100%",
        });
        this._float = gsap.to(".bloom-floating", {
          y: -6,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        });
        this._grow = gsap
          .timeline({
            paused: true,
            onStart: () => {
              this.phase = "growing";
            },
            onComplete: () => {
              this.phase = "floating";
              this.syncPlayback();
            },
          })
          .to(".bloom-book, .bloom-base", {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            ease: "back.out(1.3)",
          })
          .to(
            stems,
            {
              strokeDashoffset: 0,
              duration: 0.7,
              stagger: 0.12,
              ease: "power2.out",
            },
            0.22,
          )
          .to(
            ".bloom-leaves > *",
            {
              opacity: 1,
              scale: 1,
              duration: 0.45,
              stagger: 0.12,
              ease: "back.out(1.5)",
            },
            0.65,
          );
        ScrollTrigger.create({
          trigger: this.$el,
          start: "top 92%",
          end: "bottom top",
          onToggle: (self) => {
            this._visible = self.isActive;
            this.syncPlayback();
          },
        });
      }, this.$el);
    },
    syncPlayback() {
      const active = this._visible && !document.hidden;
      if (this.phase === "waiting" || this.phase === "growing")
        active ? this._grow?.play() : this._grow?.pause();
      if (this.phase === "floating")
        active ? this._float?.play() : this._float?.pause();
    },
  },
};
</script>
<style lang="less" scoped>
.learning-bloom {
  width: 100px;
  height: 130px;
  margin: 0 auto 16px;
  pointer-events: none;
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
}
</style>
