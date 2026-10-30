<template>
  <section class="product-intro" role="dialog" aria-modal="true" aria-labelledby="intro-heading"
    @keydown.esc.prevent="$emit('enter', true)" @keydown.tab="trap">
    <header class="intro-header">
      <BrandLogo /><button class="intro-skip" @click="$emit('enter', true)">
        跳过开场
        <AppIcon name="arrow" :size="16" />
      </button>
    </header>
    <div class="intro-copy">
      <p class="intro-overline"><i />让每一份知识，找到它的位置</p>
      <h1 id="intro-heading">你的下一次理解，<br />从这一页开始。</h1>
      <p class="intro-description">把零散的知识，连接成自己的学习路径。</p>
    </div>
    <div class="intro-bottom">
      <IntroSlideButton ref="enter" @complete="$emit('enter', false)" />
      <p class="intro-gesture"><span />向下滚动，展开学习空间</p>
      <div class="intro-status" role="status">
        <i :class="{ failed: failed.length }" />
        <span>
          {{
            failed.length
              ? "配图暂不可用，仍可进入"
              : loading
                ? "正在准备画面…"
                : "已准备好，等你探索"
          }}
        </span>
        <button v-if="failed.length" @click="load">重试配图</button>
      </div>
    </div>
    <footer class="intro-footer">
      <span>知序 · 从理解到掌握</span><button @click="$emit('motion')">
        {{ reduced ? "已减少动态效果" : "减少动态效果" }}
      </button>
    </footer>
  </section>
</template>
<script>
import BrandLogo from "../BrandLogo.vue";
import IntroSlideButton from "./IntroSlideButton.vue";
import { motionAllowed } from "../../utils/motion";
export default {
  name: "ProductIntro",
  components: { BrandLogo, IntroSlideButton },
  data: () => ({
    failed: [],
    loading: true,
    run: 0,
    wheelTotal: 0,
    touchY: null,
  }),
  computed: {
    reduced() {
      return !motionAllowed();
    },
  },
  mounted() {
    this._previousFocus = document.activeElement;
    this.load();
    this.$nextTick(() => this.$refs.enter?.focus({ preventScroll: true }));
  },
  beforeDestroy() {
    ++this.run;
    clearTimeout(this._wheelTimer);
    if (this._previousFocus?.isConnected)
      this._previousFocus.focus({ preventScroll: true });
  },
  methods: {
    load() {
      this.$emit("retry");
      const run = ++this.run;
      this.failed = [];
      this.loading = true;
      let completed = 0;
      ["book", "ready"].forEach((name) => {
        const image = new Image();
        const done = (ok) => {
          if (this._isDestroyed || run !== this.run) return;
          if (!ok) this.failed.push(name);
          if (++completed === 2) this.loading = false;
        };
        image.onload = () => done(true);
        image.onerror = () => done(false);
        image.src = "/assets/product/" + name + ".webp";
      });
    },
    wheel(event) {
      // 浏览器缩放/触控板捏合与横向浏览不属于“向下进入”。
      if (
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        this.wheelTotal = 0;
        return;
      }
      if (event.deltaY <= 0) {
        this.wheelTotal = 0;
        return;
      }
      const factor =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      this.wheelTotal += Math.min(100, event.deltaY * factor);
      clearTimeout(this._wheelTimer);
      this._wheelTimer = setTimeout(() => {
        this.wheelTotal = 0;
      }, 350);
      if (this.wheelTotal >= 90) this.$emit("enter", false);
    },
    touchStart(e) {
      this.touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    },
    touchEnd(e) {
      if (
        this.touchY !== null &&
        e.changedTouches[0] &&
        this.touchY - e.changedTouches[0].clientY > 55
      )
        this.$emit("enter", false);
      this.touchY = null;
    },
    trap(e) {
      const list = [
        ...this.$el.querySelectorAll("a[href],button:not(:disabled)"),
      ],
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
  },
};
</script>
<style lang="less" scoped>
@import "../../styles/tokens.less";

.product-intro {
  position: fixed;
  inset: 0;
  z-index: 80;
  min-height: 100dvh;
  background: transparent;
  pointer-events: none;
  overflow: hidden;
}

.intro-header {
  pointer-events: auto;
  position: absolute;
  left: 5%;
  right: 5%;
  top: 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 5;
}

.intro-skip {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9cb8cd;
  font-size: 12px;
  padding: 12px;
}

.intro-copy {
  position: absolute;
  top: 16%;
  left: 5%;
  right: 5%;
  text-align: center;
  z-index: 2;
  pointer-events: none;

  h1 {
    font-size: clamp(32px, 4.1vw, 58px);
    font-weight: 500;
    line-height: 1.38;
    letter-spacing: -1px;
    margin: 0 0 15px;
  }
}

.intro-overline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 11px;
  color: #88b4cf;
  letter-spacing: 2px;
  margin-bottom: 22px;

  i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: @cyan;
    box-shadow: 0 0 16px @cyan;
  }
}

.intro-description {
  font-size: 13px;
  color: #87a9bf;
}

.intro-bottom {
  pointer-events: auto;
  position: absolute;
  bottom: 11%;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  flex-direction: column;
  z-index: 80;
}

.intro-gesture {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 10px;
  letter-spacing: 1px;
  color: #93b5cc;
  margin: 15px 0 12px;

  span {
    height: 16px;
    width: 1px;
    background: linear-gradient(transparent, @cyan);
  }
}

.intro-status {
  font-size: 10px;
  color: #668ca6;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 20px;

  i {
    height: 4px;
    width: 4px;
    background: #549b9e;
    border-radius: 50%;

    &.failed {
      background: @amber;
    }
  }

  button {
    font-size: 10px;
    color: @cyan;
    text-decoration: underline;
  }
}

.intro-footer {
  pointer-events: auto;
  position: absolute;
  bottom: 25px;
  left: 5%;
  right: 5%;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 1px;
  color: #658aa4;

  button {
    font-size: 10px;
  }
}

@media (max-width: 767px) {
  .intro-header {
    top: 18px;

    ::v-deep .brand strong {
      font-size: 21px;
    }

    ::v-deep .brand svg {
      width: 38px;
    }
  }

  .intro-copy {
    top: 18%;

    h1 {
      font-size: 32px;
      letter-spacing: -0.5px;
    }
  }

  .intro-overline {
    font-size: 9px;
    letter-spacing: 1px;
    margin-bottom: 18px;
  }

  .intro-description {
    font-size: 11px;
  }

  .intro-bottom {
    bottom: 11%;
  }

  .intro-footer {
    bottom: 20px;
    font-size: 8px;

    button {
      font-size: 9px;
    }
  }
}

@media (max-height: 700px) and (min-width: 768px) {
  .intro-copy {
    top: 14%;

    h1 {
      font-size: 37px;
    }

    .intro-overline {
      margin-bottom: 10px;
    }
  }

  .intro-bottom {
    bottom: 8%;
  }
}

@media (max-height: 560px) and (min-width: 600px) {
  .intro-copy {
    top: 22%;
    left: 6%;
    right: auto;
    width: 44%;
    text-align: left;

    h1 {
      font-size: 32px;
      line-height: 1.35;
      letter-spacing: -1px;
    }
  }

  .intro-overline {
    justify-content: flex-start;
    font-size: 8px;
    letter-spacing: 0.5px;
    margin-bottom: 13px;
  }

  .intro-description {
    font-size: 10px;
  }

  .intro-bottom {
    left: 6%;
    right: auto;
    bottom: 16%;
    align-items: flex-start;
  }

  .intro-gesture,
  .intro-status {
    display: none;
  }

  .intro-footer {
    bottom: 15px;
  }
}
</style>
