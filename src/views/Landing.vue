<template>
  <main class="landing-page" :class="{
    'is-intro': introOpen,
    'is-opening': opening,
    'is-reduced': !allowMotion,
  }" :data-opening="String(opening)" @wheel.passive="introGesture('wheel', $event)"
    @touchstart.passive="introGesture('touchStart', $event)" @touchend.passive="introGesture('touchEnd', $event)">
    <div class="product-horizon" aria-hidden="true" />
    <div class="landing-first-screen">
      <PublicHeader :inert="introOpen ? '' : null">
        <BrandLogo />
        <nav class="landing-links" aria-label="产品导航">
          <a href="#workflow" @click.prevent="explore">产品体验</a>
          <a href="#product-principles" @click.prevent="scrollTo('product-principles')">学习方式</a>
        </nav>
        <router-link to="/login" class="product-login">
          登录学习空间
          <AppIcon name="arrow" :size="17" />
        </router-link>
      </PublicHeader>
      <section class="landing-hero" aria-labelledby="hero-heading">
        <div class="hero-copy" :inert="introOpen ? '' : null">
          <p class="hero-overline"><span />大学生的 AI 学习空间</p>
          <h1 id="hero-heading" ref="heading" tabindex="-1">
            把零散知识，<br />连成自己的<br class="desktop-break" />学习路径。
          </h1>
          <p class="hero-description">
            从一份课堂讲义，到一次真正的理解。<br />资料、提问、练习与复习，在这里连成一条线。
          </p>
          <div class="hero-actions">
            <button class="product-primary" :disabled="busy" @click="experience">
              {{ busy ? "正在进入…" : "进入学习空间" }}
              <AppIcon name="arrow" :size="18" />
            </button>
            <button type="button" class="product-explore" @click="$refs.story.startGuide()">
              <span aria-hidden="true">
                <AppIcon name="play" :size="13" />
              </span>跟着示例走一遍
            </button>
          </div>
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
          <p class="hero-footnote">从你的课程出发，按自己的节奏学习。</p>
        </div>
        <a href="#product-principles" class="hero-scroll"
          :class="{ 'is-ready': motionReady, 'is-animated': motionReady && allowMotion }"
          :inert="motionReady ? null : ''" @click.prevent="scrollTo('product-principles', true)">
          <span class="hero-scroll-icon" aria-hidden="true">
            <span class="hero-scroll-arrow"><AppIcon name="arrow" :size="20" /></span>
          </span>
          <span>向下探索</span>
        </a>
        <div ref="visual" class="hero-visual">
          <div ref="scene" class="hero-scene-shell" :class="{ 'intro-fixed': introOpen }">
            <ProductHeroScene ref="art" :intro="introOpen" :active="sceneReady" @enter="enter(false)" />
          </div>
        </div>
      </section>
    </div>
    <LandingPrinciples :animated="smoothScrollReady" :inert="introOpen ? '' : null" />
    <LearningStory ref="story" :enabled="!introOpen && !opening" :scroll-page="scrollPage" :inert="introOpen ? '' : null"
      @enter-workspace="experience" />
    <section class="product-closing" :inert="introOpen ? '' : null">
      <LearningBloom :enabled="motionReady" />
      <p>从理解到掌握</p>
      <h2>下一步学习，<br />从这里开始。</h2>
      <button class="product-primary" :disabled="busy" @click="experience">
        进入学习空间
        <AppIcon name="arrow" :size="18" />
      </button><span>登录账号，建立属于自己的课程。</span>
    </section>
    <PublicFooter :inert="introOpen ? '' : null">
      <BrandLogo /><span class="footer-description">大学生 AI 教育与学习平台</span>
      <div class="footer-actions">
        <button @click="replay">重播开场</button><button :disabled="systemReduced" @click="toggleMotion">
          {{
            systemReduced
              ? "已跟随系统减少动态"
              : state.settings.reducedMotion
                ? "开启动态效果"
                : "减少动态效果"
          }}
        </button>
        <button aria-label="返回顶部" @click="scrollTo('top')">↑</button>
      </div>
    </PublicFooter>
    <transition name="intro-veil" :css="allowMotion">
      <div v-if="introOpen" class="intro-backdrop" aria-hidden="true" />
    </transition>
    <transition name="intro-veil" :css="allowMotion">
      <ProductIntro ref="intro" v-if="introOpen" @enter="enter" @motion="toggleMotion" @retry="retryArt" />
    </transition>
  </main>
</template>
<script>
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import PublicHeader from "../components/PublicHeader.vue";
import PublicFooter from "../components/PublicFooter.vue";
import BrandLogo from "../components/BrandLogo.vue";
import ProductHeroScene from "../components/product/ProductHeroScene.vue";
import ProductIntro from "../components/product/ProductIntro.vue";
import LearningStory from "../components/product/LearningStory.vue";
import LearningBloom from "../components/product/LearningBloom.vue";
import LandingPrinciples from "../components/product/LandingPrinciples.vue";
import { createTextReveals } from "../utils/textMotion";
import { navigation } from "../utils/navigation";
import { state, persist } from "../store";
import { getToken } from "../services/api";
import { motionAllowed, motion } from "../utils/motion";
const INTRO_KEY = "zhixu-product-intro-seen-v1";
function seen() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch (_) {
    return false;
  }
}
export default {
  name: "Landing",
  components: {
    PublicHeader,
    PublicFooter,
    BrandLogo,
    ProductHeroScene,
    ProductIntro,
    LearningStory,
    LearningBloom,
    LandingPrinciples,
  },
  data() {
    const intro =
      this.$route.path === "/" && (this.$route.query.intro === "1" || !seen());
    return {
      state,
      introOpen: intro,
      opening: false,
      sceneReady: !intro,
      busy: false,
      error: "",
    };
  },
  computed: {
    textReady() {
      return (
        !this.introOpen &&
        !navigation.overlayVisible &&
        !navigation.overlayLeaving
      );
    },
    motionReady() {
      return this.textReady && !this.opening;
    },
    smoothScrollReady() {
      return this.motionReady && this.allowMotion;
    },
    allowMotion() {
      return motionAllowed();
    },
    systemReduced() {
      return motion.systemReduced;
    },
  },
  watch: {
    "$route.fullPath"() {
      this.syncRoute();
    },
    allowMotion(value) {
      if (!value) this._entry?.progress(1);
      this.$nextTick(this.refreshText);
    },
    textReady() {
      this.$nextTick(this.refreshText);
    },
    smoothScrollReady() {
      this.syncSmoothScroll();
    },
  },
  mounted() {
    this.syncRoute();
    this.syncSmoothScroll();
    this.$nextTick(this.refreshText);
    this._resize = () => {
      if (this.opening) this._entry?.progress(1);
    };
    window.addEventListener("resize", this._resize);
  },
  beforeDestroy() {
    this.destroySmoothScroll();
    this._textCleanup?.();
    cancelAnimationFrame(this._unlockFrame);
    this._entryContext?.revert();
    this.unlock();
    window.removeEventListener("resize", this._resize);
  },
  methods: {
    syncSmoothScroll() {
      if (!this.smoothScrollReady) {
        this.destroySmoothScroll();
        return;
      }
      if (this._lenis) return;
      this._lenis = new Lenis({
        eventsTarget: this.$el,
        lerp: 0.12,
        allowNestedScroll: true,
        autoRaf: true,
      });
      this._lenis.on("scroll", ScrollTrigger.update);
    },
    destroySmoothScroll() {
      this._lenis?.destroy();
      this._lenis = null;
    },
    refreshText() {
      if (this._isDestroyed || this._isBeingDestroyed) return;
      this._textCleanup?.();
      this._textCleanup = null;
      if (this.textReady && this.allowMotion)
        this._textCleanup = createTextReveals(
          this.$el,
          "#hero-heading, .hero-description, .product-closing > p, .product-closing > h2",
          { delay: this.opening ? 0.32 : 0 },
        );
    },
    introGesture(name, event) {
      if (this.introOpen) this.$refs.intro?.[name](event);
    },
    syncRoute() {
      if (this.$route.path === "/") {
        if (this.$route.query.intro === "1" || !seen()) this.showIntro();
        else this.$router.replace("/welcome").catch(() => { });
      } else if (this.introOpen) {
        this.introOpen = false;
        this.sceneReady = true;
        this.unlock();
      }
    },
    showIntro() {
      this.destroySmoothScroll();
      cancelAnimationFrame(this._unlockFrame);
      this._entryContext?.revert();
      this.opening = false;
      this.introOpen = true;
      this.sceneReady = false;
      this.lock();
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    lock() {
      if (this._locked) return;
      this._overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      this._locked = true;
    },
    unlock() {
      if (!this._locked) return;
      document.body.style.overflow = this._overflow || "";
      this._locked = false;
    },
    async enter(skip = false) {
      if (!this.introOpen || this.opening) return;
      const before = this.$refs.scene.getBoundingClientRect(),
        animate = this.allowMotion && !skip;
      this.introOpen = false;
      this.opening = animate;
      this.sceneReady = !animate;
      try {
        localStorage.setItem(INTRO_KEY, "1");
      } catch (_) {
        /* 浏览器禁用存储不影响进入。 */
      }
      if (this.$route.path !== "/welcome")
        await this.$router.replace("/welcome").catch(() => { });
      await this.$nextTick();
      if (this._isDestroyed) return;
      const scene = this.$refs.scene,
        after = scene.getBoundingClientRect();
      const done = () => {
        this.opening = false;
        this.sceneReady = true;
        // 等当前手势的默认滚动处理结束再释放滚动锁，保持进入后的首屏位置。
        this._unlockFrame = requestAnimationFrame(() => {
          if (this._isDestroyed) return;
          this.unlock();
          window.scrollTo({ top: 0, behavior: "auto" });
          this.$refs.heading?.focus({ preventScroll: true });
        });
      };
      if (!animate) {
        done();
        return;
      }
      this._entryContext?.revert();
      this._entryContext = gsap.context(() => {
        this._entry = gsap.timeline({ onComplete: done });
        this._entry.fromTo(
          scene,
          {
            x: before.left - after.left,
            y: before.top - after.top,
            scaleX: before.width / after.width,
            scaleY: before.height / after.height,
            transformOrigin: "0 0",
          },
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 1.05,
            ease: "power3.inOut",
            clearProps: "transform,transformOrigin",
          },
          0,
        );
        this._entry.fromTo(
          this.$el.querySelectorAll(".hero-copy > *"),
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.06,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
          0.25,
        );
        this._entry.call(
          () => {
            this.sceneReady = true;
          },
          [],
          0.7,
        );
      }, this.$el);
    },
    replay() {
      this.scrollPage(0, true);
      if (this.$route.path === "/" && this.$route.query.intro === "1")
        this.showIntro();
      else
        this.$router.push({ path: "/", query: { intro: "1" } }).catch(() => { });
    },
    retryArt() {
      if (this.$refs.art) {
        this.$refs.art.missingBook = false;
        this.$refs.art.missingPages = false;
      }
    },
    toggleMotion() {
      if (this.systemReduced) return;
      state.settings.reducedMotion = !state.settings.reducedMotion;
      persist();
    },
    explore() {
      this.scrollTo("workflow");
    },
    scrollTo(id, focus = false) {
      if (id === "top") {
        this.scrollPage(0);
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      if (focus) target?.focus({ preventScroll: true });
      this.scrollPage(target);
    },
    scrollPage(target, immediate = false) {
      if (this._lenis) {
        // 浏览器可能刚通过键盘或焦点滚动。锚点以实际视口位置计算。
        const top = typeof target === "number" ? target
          : window.scrollY + target.getBoundingClientRect().top - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
        this._lenis.scrollTo(top, { immediate });
        return;
      }
      const behavior = immediate || !this.allowMotion ? "instant" : "smooth";
      if (typeof target === "number") window.scrollTo({ top: target, behavior });
      else target.scrollIntoView({ block: "start", behavior });
    },
    async experience() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        await this.$router.push(getToken() ? "/app/overview" : "/login");
      } catch (error) {
        this.error = error.message || "暂时无法进入，请重试。";
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

/* 产品官网布局专属样式；账号工作台继续使用各页面原来的布局与加载流程。 */
.landing-page {
  position: relative;
  min-height: 100dvh;
  background: #041524;
  isolation: isolate;
  overflow: clip;

  .public-header {
    position: relative;
    z-index: 4;
    max-width: 1500px;
    width: 100%;
    margin: 0 auto;
    padding: 30px 5%;
    min-height: 102px;
  }

  .public-footer {
    max-width: 1410px;
    margin: auto;
    border-top: 1px solid #183448;
    padding: 30px 45px;
    gap: 35px;
  }
}

.landing-first-screen {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}

.product-horizon {
  position: absolute;
  left: 25%;
  right: 0;
  top: 0;
  height: 820px;
  z-index: -1;
  background:
    linear-gradient(0deg, #041524 0%, #041524bf 40%, #041524a8 80%),
    url("/assets/product/planet.webp") right top/cover no-repeat;
  opacity: 0.35;
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent, #000 45%);
}

.landing-links {
  display: flex;
  gap: 34px;
  color: #7e9eb6;
  font-size: 12px;

  a {
    padding: 10px 0;
    transition: color 0.2s;

    &:hover {
      color: @text;
    }
  }
}

.product-login {
  display: flex;
  align-items: center;
  gap: 18px;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: #75d9ee;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover::after,
  &:focus-visible::after {
    transform: scaleX(1);
  }

  padding: 9px 0;
  font-size: 12px;
  color: #bdd4e5;
}

.landing-hero {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 1410px;
  margin: 0 auto;
  padding: clamp(32px, 8svh, 75px) 5% clamp(65px, 10svh, 100px);
  display: grid;
  grid-template-columns: 0.92fr 1.1fr;
  gap: 15px;
  align-items: center;
}

.hero-copy {
  position: relative;
  z-index: 3;

  h1 {
    font-size: clamp(40px, 4.6vw, 68px);
    font-weight: 500;
    line-height: 1.29;
    letter-spacing: -2px;
    margin: 0 0 29px;
    white-space: nowrap;
    outline: none;
  }
}

.hero-overline {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #729cb7;
  font-size: 10px;
  letter-spacing: 2px;
  margin-bottom: 24px;

  span {
    width: 4px;
    height: 4px;
    background: @cyan;
    border-radius: 50%;
    box-shadow: 0 0 12px @cyan;
  }
}

.hero-description {
  font-size: 13px;
  color: #8caec5;
  line-height: 2.1;
  margin-bottom: 30px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 25px;
}

.product-primary {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 33px;
  padding: 14px 20px;
  color: #062637;
  background: #69d8ef;
  border: 1px solid #69d8ef;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.2s,
    transform 0.2s;
  min-height: 47px;

  &:hover {
    background: #9ceafb;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.product-explore {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: #b0c9db;
  min-height: 44px;
  text-align: left;

  &:hover, &:focus-visible { color: #e3f5ff; }

  span {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border-radius: 50%;
    border: 1px solid #35596d;
  }
}

.hero-footnote {
  color: #547c97;
  font-size: 10px;
  margin-top: 24px;
  letter-spacing: 0.5px;
}

.hero-visual {
  position: relative;
  z-index: 2;
  min-width: 0;
  align-self: center;
}

.hero-scene-shell {
  position: relative;
  width: 112%;
  margin-left: -3%;
  aspect-ratio: 760/570;
}

.hero-scene-shell.intro-fixed {
  position: fixed;
  left: 50%;
  top: 31vh;
  width: min(700px, 78vw);
  margin: 0;
  transform: translateX(-50%);
  z-index: 72;
}

.hero-scroll {
  position: absolute;
  z-index: 4;
  top: min(calc(88svh - 102px), calc(100% - 76px));
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 5px 9px;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #a2cadf;
  white-space: nowrap;

  &:not(.is-ready) {
    visibility: hidden;
  }

  &:hover, &:focus-visible {
    color: #e2f8ff;

    .hero-scroll-icon {
      background: #12394d;
      border-color: #76daef;
    }
  }
}

.hero-scroll-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid #437b92;
  border-radius: 50%;
  background: #0a2335;
  color: #89e1f3;
  transition: background-color 0.2s, border-color 0.2s;
}

.hero-scroll-arrow {
  display: grid;
  place-items: center;

  .app-icon { transform: rotate(90deg); }
}

.hero-scroll.is-animated .hero-scroll-arrow {
  animation: hero-scroll-down 1.6s ease-in-out 3;
}

@keyframes hero-scroll-down {
  0%, 100% { transform: translateY(0); }
  56% { transform: translateY(5px); }
}

.product-closing {
  max-width: 1280px;
  margin: auto;
  text-align: center;
  padding: 40px 30px 115px;
  position: relative;

  p {
    color: #6693ad;
    font-size: 10px;
    letter-spacing: 3px;
    margin-bottom: 20px;
  }

  h2 {
    font-size: clamp(35px, 3.7vw, 51px);
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: -1px;
    margin-bottom: 28px;
  }

  >span {
    display: block;
    font-size: 10px;
    color: #5f859f;
    margin-top: 18px;
  }
}

.footer-description {
  color: #547a94;
  font-size: 10px;
  margin-left: auto;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 22px;
  color: #739bb4;
  font-size: 10px;

  button {
    font-size: 10px;
    white-space: nowrap;

    &:last-child {
      font-size: 21px;
    }
  }
}

.is-intro {
  .hero-copy {
    opacity: 0;
  }

  .hero-visual {
    z-index: 72;
  }
}

.is-opening .hero-visual {
  z-index: 72;
}

.intro-veil-leave-active {
  transition: opacity 0.65s;
  pointer-events: none;
}

.intro-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: radial-gradient(ellipse at 50% 53%,
      #0b304b 0,
      #061b2c 42%,
      #041524 75%);
}

.intro-veil-leave-to {
  opacity: 0;
}

.is-reduced {

  .product-primary,
  .hero-scroll-icon,
  .landing-links a,
  .product-login::after {
    transition: none;
  }
}

@media (min-width: 1500px) {
  .landing-hero {
    padding-top: clamp(40px, 11svh, 105px);
    padding-bottom: clamp(65px, 13svh, 125px);
  }

  .hero-copy h1 {
    font-size: 71px;
  }
}

@media (max-width: 1100px) {
  .landing-hero {
    padding-top: clamp(30px, 7svh, 65px);
    grid-template-columns: 1fr 1.04fr;
  }

  .hero-copy h1 {
    font-size: clamp(41px, 4.8vw, 54px);
    letter-spacing: -1.5px;
  }

  .hero-actions {
    gap: 18px;
  }

  .product-primary {
    gap: 22px;
    padding: 13px 17px;
  }

  .product-explore {
    font-size: 10px;
  }

  .hero-description {
    font-size: 12px;
  }
}

@media (min-width: 768px) and (max-height: 850px) {
  .landing-hero {
    padding-top: clamp(28px, 6svh, 56px);
    padding-bottom: clamp(65px, 9svh, 84px);
  }

  .hero-copy h1 {
    font-size: clamp(37px, min(4.6vw, 7.9svh), 66px);
    margin-bottom: 22px;
  }

  .hero-scene-shell:not(.intro-fixed) {
    width: min(112%, max(320px, calc((100svh - 264px) * 4 / 3)));
    margin-inline: auto;
  }
}

@media (max-width: 767px) {
  .landing-page {
    .public-header {
      padding: 22px 24px;
      min-height: 90px;
    }

    .public-footer {
      padding: 27px 24px;
      flex-wrap: wrap;
      gap: 22px;

      ::v-deep .brand svg {
        width: 35px;
      }

      ::v-deep .brand strong {
        font-size: 20px;
      }
    }
  }

  .landing-links {
    display: none;
  }

  .product-login {
    font-size: 10px;
    gap: 9px;
  }

  .product-horizon {
    left: 0;
    height: 700px;
    opacity: 0.18;
  }

  .landing-hero {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 40px 24px 70px;
  }

  .hero-copy h1 {
    font-size: clamp(30px, 8.9vw, 36px);
    line-height: 1.35;
    letter-spacing: -0.8px;
    white-space: normal;
    margin-bottom: 22px;
  }

  .desktop-break {
    display: none;
  }

  .hero-overline {
    font-size: 9px;
    letter-spacing: 1px;
    margin-bottom: 21px;
  }

  .hero-description {
    font-size: 11px;
    line-height: 2;
  }

  .hero-actions {
    gap: 21px;
  }

  .hero-footnote {
    font-size: 9px;
    margin-top: 20px;
  }

  .hero-visual {
    width: 100%;
    margin: 5px 0 50px;
  }

  .hero-scene-shell {
    width: 112%;
    margin-left: -6%;
  }

  .hero-scene-shell.intro-fixed {
    width: min(460px, 100vw);
    top: 31vh;
    margin: 0;
  }

  .hero-scroll {
    position: static;
    align-self: center;
    transform: none;
  }

  .product-closing {
    padding: 25px 24px 75px;

    h2 {
      font-size: 36px;
    }
  }

  .footer-description {
    margin-left: 0;
  }

  .footer-actions {
    width: 100%;
    justify-content: space-between;
    border-top: 1px solid #163649;
    padding-top: 20px;
    font-size: 10px;
  }

  .is-intro .hero-visual {
    margin: 0;
  }
}

@media (max-width: 380px) {
  .landing-page .public-header {
    padding: 18px;
  }

  .landing-hero {
    padding-left: 18px;
    padding-right: 18px;
    padding-top: 30px;
  }

  .hero-copy h1 {
    font-size: 30px;
  }

  .hero-actions {
    gap: 15px;
  }

  .product-primary {
    font-size: 11px;
    padding: 12px 15px;
    gap: 16px;
  }

  .product-explore {
    gap: 7px;
    font-size: 10px;
  }

  .hero-description {
    font-size: 10px;
  }

  .footer-description {
    font-size: 9px;
  }
}

@media (max-height: 560px) and (min-width: 600px) {
  .hero-scene-shell.intro-fixed {
    width: min(410px, 48vw);
    left: 70%;
    top: 5vh;
  }
}
</style>
