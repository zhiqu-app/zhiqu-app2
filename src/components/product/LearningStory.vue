<template>
  <section id="workflow" ref="root" class="learning-story" aria-labelledby="story-heading">
    <div class="story-heading">
      <p><span />从这一页，到下一步</p>
      <h2 id="story-heading">让学习的每一步，<br />都有下一步。</h2>
      <span>向下探索，也可以点击步骤直接查看。</span>
      <button v-if="!guided" type="button" class="start-guide" @click="startGuide">
        <AppIcon name="play" :size="13" />{{ guideProgress.includes(true) ? "继续操作引导" : "开启操作引导" }}
      </button>
    </div>
    <p v-if="guided" class="sr-only" role="status">已完成 {{ guideCount }} 个操作，共四步</p>
    <div ref="layout" class="story-layout">
      <div class="story-copy">
        <article v-for="(item, i) in steps" :key="item.name" ref="steps" class="story-step"
          :class="{ active: active === i }" :data-step="i">
          <button class="story-step-button" :aria-current="active === i ? 'step' : null" @click="choose(i)">
            <span class="step-number">{{ String(i + 1).padStart(2, "0") }}</span><span class="step-content"><small>{{
                item.name }}</small>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
              <span class="step-detail">
                <AppIcon :name="item.icon" :size="15" />{{ item.detail }}
              </span>
            </span>
          </button>
          <ProductDemo v-if="narrow" ref="mobileDemos" :step="i" :selected="selectedNode"
            :guide="guided ? guideProgress : null" @guide-action="markGuide" @exit-guide="exitGuide(i)"
            @enter-workspace="$emit('enter-workspace')"
            @select-node="selectedNode = $event" @advance="advance" @source="showSource" />
        </article>
      </div>
      <div v-if="!narrow" ref="stage" class="story-stage" :data-step="active">
        <div class="story-stage-label">
          <span>从一份线性代数讲义出发</span><span>{{ String(active + 1).padStart(2, "0") }} / 04</span>
        </div>
        <ProductDemo ref="desktopDemo" contained :step="active" :selected="selectedNode"
          :guide="guided ? guideProgress : null" @guide-action="markGuide" @exit-guide="exitGuide(active)"
          @enter-workspace="$emit('enter-workspace')"
          @select-node="selectedNode = $event" @advance="advance" @source="showSource" />
        <nav class="story-stage-track" aria-label="学习演示章节">
          <button v-for="(label, i) in chapterLabels" :key="label" type="button"
            :aria-current="active === i ? 'step' : null" @click="choose(i)">
            <span aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>{{ label }}
          </button>
        </nav>
      </div>
    </div>
  </section>
</template>
<script>
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { productSteps } from "../../data/productDemo";
import { motionAllowed } from "../../utils/motion";
import { createTextReveals } from "../../utils/textMotion";
import ProductDemo from "./ProductDemo.vue";
gsap.registerPlugin(ScrollTrigger);

export default {
  name: "LearningStory",
  components: { ProductDemo },
  props: { enabled: { type: Boolean, default: true } },
  data: () => ({
    steps: productSteps,
    chapterLabels: ["资料", "星图", "答疑", "练习"],
    selectedNode: "product-eigen",
    guided: false,
    guideProgress: [false, false, false, false],
    active: 0,
    narrow: matchMedia("(max-width: 900px), (max-height: 600px)").matches,
  }),
  computed: {
    guideCount() {
      return this.guideProgress.filter(Boolean).length;
    },
    allowMotion() {
      return motionAllowed();
    },
  },
  mounted() {
    this._media = matchMedia("(max-width: 900px), (max-height: 600px)");
    this._change = () => {
      this.narrow = this._media.matches;
      this.$nextTick(this.observe);
    };
    this._media.addEventListener("change", this._change);
    this.observe();
  },
  watch: {
    allowMotion() {
      this.$nextTick(this.observe);
    },
    enabled() {
      this.$nextTick(this.observe);
    },
  },
  beforeDestroy() {
    this._textCleanup?.();
    this._context?.revert();
    this._media?.removeEventListener("change", this._change);
  },
  methods: {
    observe() {
      if (this._isDestroyed || this._isBeingDestroyed) return;
      this._context?.revert();
      this._chapterScroll = null;
      this._textCleanup?.();
      this._textCleanup = null;
      if (!this.enabled) return;
      if (this.allowMotion)
        this._textCleanup = createTextReveals(
          this.$el,
          ".story-heading h2, .step-content h3, .step-content p",
        );
      if (this.narrow) return;
      this._context = gsap.context(() => {
        const { layout, stage } = this.$refs;
        const stickyTop = () => parseFloat(getComputedStyle(stage).top);
        // 用舞台可以完整停留在屏幕内的区间划分四章。
        this._chapterScroll = ScrollTrigger.create({
          trigger: layout,
          start: () => `top ${stickyTop()}px`,
          end: () => `bottom ${stickyTop() + stage.offsetHeight}px`,
          onUpdate: ({ progress }) => {
            this.active = Math.min(this.steps.length - 1, Math.floor(progress * this.steps.length));
          },
        });
      }, this.$el);
      ScrollTrigger.refresh();
    },
    advance(i) {
      if (i === 1) this.selectedNode = "product-eigen";
      this.choose(i, "heading");
    },
    startGuide() {
      this.guided = true;
      const first = this.guideProgress.indexOf(false);
      this.choose(first < 0 ? this.steps.length - 1 : first, "heading");
    },
    markGuide(i) {
      if (!this.guideProgress[i]) this.$set(this.guideProgress, i, true);
    },
    exitGuide(i) {
      this.guided = false;
      this.$nextTick(() => {
        const demo = this.narrow ? this.$refs.mobileDemos?.[i] : this.$refs.desktopDemo;
        demo?.focusHeading();
      });
    },
    showSource() {
      this.choose(0, "source");
    },
    choose(i, destination) {
      const section = this.$refs.steps[i];
      if (!section) return;
      this.active = i;
      if (this._chapterScroll) {
        const { start, end } = this._chapterScroll;
        const top = start + ((i + 0.5) / this.steps.length) * (end - start);
        window.scrollTo({ top, behavior: "instant" });
        this._chapterScroll.update();
      } else if (this.narrow && destination !== "source") {
        section.scrollIntoView({ block: "start", behavior: this.allowMotion ? "smooth" : "auto" });
      }
      if (!destination) return;
      this.$nextTick(() => {
        const demo = this.narrow ? this.$refs.mobileDemos?.[i] : this.$refs.desktopDemo;
        if (destination === "source") demo?.focusSource();
        else demo?.focusHeading();
      });
    },
  },
};
</script>
<style lang="less" scoped>
@import "../../styles/tokens.less";

/* 桌面只固定演示区，文案保留自然滚动；手机逐段呈现，不锁定整页。 */
.learning-story {
  max-width: 1280px;
  margin: 0 auto;
  padding: 110px 44px 80px;
  scroll-margin-top: 45px;
}

.story-heading {
  margin-bottom: 40px;

  p {
    font-size: 10px;
    letter-spacing: 2px;
    color: #6d9cb7;
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 22px;

    >span {
      height: 1px;
      width: 35px;
      background: #42bbdc;
    }
  }

  h2 {
    font-size: clamp(32px, 3.2vw, 46px);
    font-weight: 500;
    letter-spacing: -1px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  >span {
    font-size: 12px;
    color: #6c92ad;
  }
}

.start-guide {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  margin-top: 12px;
  color: @cyan;
  font-size: 13px;

  &:hover, &:focus-visible { text-decoration: underline; }
}

.story-layout {
  overflow-anchor: none;
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 85px;
  align-items: start;
}

.story-copy {
  min-width: 0;
}

.story-step {
  min-height: 355px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #17364b;
  scroll-margin-top: 75px;

  &:last-child {
    border: 0;
  }
}

.story-step-button {
  display: flex;
  align-items: flex-start;
  gap: 22px;
  text-align: left;
  padding: 50px 0;
  width: 100%;
  color: #62859f;
  transition: color 0.3s;
}

.step-number {
  font-size: 13px;
  padding-top: 5px;
  min-width: 21px;
  color: #41657e;
}

.step-content {
  small {
    font-size: 10px;
    letter-spacing: 1px;
    color: #6e9bb5;
  }

  h3 {
    font-size: 25px;
    font-weight: 500;
    line-height: 1.5;
    color: #90aec4;
    margin: 14px 0;
  }

  p {
    font-size: 13px;
    line-height: 2;
    margin-bottom: 18px;
    color: #6b90ab;
  }
}

.step-detail {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 10px;
  color: #3b718c;
}

.story-step.active {
  .step-number {
    color: @cyan;
  }

  .step-content h3 {
    color: #e3f0f8;
  }

  .step-content p {
    color: #a0bacd;
  }

  .step-detail {
    color: #71b6cb;
  }
}

.story-stage {
  position: sticky;
  top: 110px;
  padding-top: 35px;
  min-width: 0;

  // 各演示保持相同窗口高度，切换内容和展开解析不会触发浏览器滚动锚定跳跃。
  ::v-deep .demo-content {
    height: clamp(260px, calc(100dvh - 340px), 520px);
    min-height: 0;
    overflow-y: auto;
    overflow-anchor: none;
    scrollbar-width: thin;
  }
}

.story-stage-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #597f98;
  font-size: 9px;
  margin-bottom: 13px;
  letter-spacing: 1px;
}

.story-stage-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 12px auto 0;

  button {
    min-height: 44px;
    padding: 8px 4px;
    border-top: 2px solid #21465e;
    border-radius: 0 0 5px 5px;
    color: #a3bbce;
    font-size: 12px;

    span { margin-right: 6px; color: #7394ac; font-size: 9px; }
    &:hover, &:focus-visible { background: #102d41; color: @text; }
    &[aria-current="step"] {
      color: #d9f5ff;
      border-color: @cyan;
      background: #102f43;
      span { color: @cyan; }
    }
  }
}

@media (max-width: 1100px) {
  .story-layout {
    gap: 45px;
    grid-template-columns: 1fr 1.3fr;
  }

  .learning-story {
    padding: 85px 32px 50px;
  }

  .step-content h3 {
    font-size: 22px;
  }
}

@media (max-width: 900px), (max-height: 600px) {
  .learning-story {
    padding: 65px 24px 30px;
  }

  .story-layout {
    display: block;
  }

  .story-heading {
    margin-bottom: 20px;
  }

  .story-step {
    display: block;
    padding-bottom: 40px;
    margin-bottom: 20px;
    min-height: 0;
  }

  .story-step-button {
    padding: 30px 0;
    gap: 16px;
  }

  .step-content h3 {
    font-size: 24px;
    color: #d5e6f2;
  }

  .step-content p {
    color: #8cacc3;
  }

  .step-detail {
    color: #6cacc3;
  }

  .story-heading h2 {
    font-size: 33px;
  }
}

@media (max-width: 380px) {
  .learning-story {
    padding-left: 18px;
    padding-right: 18px;
  }

  .step-content h3 {
    font-size: 21px;
  }

  .step-content p {
    font-size: 12px;
  }

  .story-heading h2 {
    font-size: 29px;
  }
}
</style>
