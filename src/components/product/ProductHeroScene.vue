<template>
  <div
    class="product-scene"
    :aria-hidden="intro ? 'true' : null"
    :class="{ 'is-intro': intro, 'is-reduced': reduced }"
    @pointermove="move"
    @pointerleave="rest"
    @click="intro && $emit('enter')"
  >
    <div ref="layers" class="scene-layers">
      <div class="scene-orbit orbit-back" aria-hidden="true" />
      <div class="scene-orbit orbit-front" aria-hidden="true" />
      <img
        v-if="!missingBook"
        class="scene-book"
        src="/assets/product/book.webp"
        alt=""
        decoding="async"
        fetchpriority="high"
        @error="missingBook = true"
      />
      <div v-else class="scene-book-fallback" aria-hidden="true">
        <AppIcon name="book" :size="150" />
      </div>
      <img
        v-if="!missingPages"
        class="scene-pages"
        src="/assets/product/ready.webp"
        alt=""
        decoding="async"
        @error="missingPages = true"
      />
      <svg
        class="scene-spine"
        viewBox="0 0 760 550"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M380 430 C380 290 170 280 95 165 M380 430 C380 300 280 250 275 85 M380 430 C380 330 500 260 480 165 M380 430 C450 320 650 260 665 85"
        />
      </svg>
      <div
        class="scene-map"
        :inert="intro ? '' : null"
        :aria-hidden="intro ? 'true' : null"
      >
        <KnowledgeGraph
          title="线性代数示例知识星图"
          :nodes="nodes"
          :edges="edges"
          :selected="selected"
          :playback="active && !intro"
          @select="selected = $event.id"
        />
      </div>
      <div class="scene-origin" aria-hidden="true">
        <i /><span>从这一页，开始连接</span>
      </div>
    </div>
    <div class="scene-caption" aria-live="polite">
      <span class="scene-caption-label"
        ><i class="dot amber" />示例知识连接</span
      ><strong>{{ selectedNode.label }}</strong>
      <p>{{ selectedNode.quote }}</p>
      <small>点击上方知识点，探索它们的关系</small>
    </div>
  </div>
</template>
<script>
import { gsap } from "gsap";
import KnowledgeGraph from "../KnowledgeGraph.vue";
import { productNodes, productEdges } from "../../data/productDemo";
import { motionAllowed } from "../../utils/motion";
export default {
  name: "ProductHeroScene",
  components: { KnowledgeGraph },
  props: { intro: Boolean, active: { type: Boolean, default: true } },
  data: () => ({
    nodes: productNodes,
    edges: productEdges,
    selected: "product-eigen",
    missingBook: false,
    missingPages: false,
  }),
  computed: {
    selectedNode() {
      return this.nodes.find((n) => n.id === this.selected) || this.nodes[0];
    },
    reduced() {
      return !motionAllowed();
    },
  },
  watch: {
    reduced(value) {
      if (value) this.rest();
    },
  },
  beforeDestroy() {
    gsap.killTweensOf(this.$refs.layers);
  },
  methods: {
    move(event) {
      if (
        this.reduced ||
        event.pointerType === "touch" ||
        !matchMedia("(pointer:fine)").matches
      )
        return;
      const r = this.$el.getBoundingClientRect();
      gsap.to(this.$refs.layers, {
        x: ((event.clientX - r.left - r.width / 2) / r.width) * 16,
        y: ((event.clientY - r.top - r.height / 2) / r.height) * 12,
        duration: 0.7,
        ease: "power2.out",
        overwrite: true,
      });
    },
    rest() {
      gsap.to(this.$refs.layers, {
        x: 0,
        y: 0,
        duration: this.reduced ? 0 : 0.7,
        overwrite: true,
      });
    },
  },
};
</script>
<style lang="less" scoped>
@import "../../styles/tokens.less";
/* 产品页共享场景：图片与 SVG 使用同一舞台，入场只移动外层容器。 */
.product-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 760/570;
  isolation: isolate;
  user-select: none;
}
.scene-layers {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.scene-book,
.scene-pages {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  transition:
    opacity 0.8s,
    transform 1s;
}
.scene-book {
  z-index: 2;
  filter: drop-shadow(0 15px 40px #08b8ff18);
}
.scene-pages {
  z-index: 0;
  opacity: 0.1;
  transform: translateY(-20px) scale(0.91);
}
.scene-orbit {
  position: absolute;
  left: 7%;
  top: 43%;
  width: 86%;
  height: 45%;
  border: 1px solid #2195c32c;
  border-radius: 50%;
  transform: rotateX(60deg) rotate(-16deg);
  pointer-events: none;
  &.orbit-back {
    left: 1%;
    width: 98%;
    height: 55%;
    top: 36%;
    border-style: dashed;
    opacity: 0.45;
    transform: rotateX(60deg) rotate(20deg);
  }
}
.scene-spine {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  path {
    stroke: #25baff;
    stroke-width: 0.7;
    opacity: 0.2;
    stroke-dasharray: 4 8;
  }
}
.scene-map {
  position: absolute;
  left: 0;
  right: 0;
  top: 2%;
  z-index: 3;
  transition: opacity 0.5s;
  ::v-deep .graph-legend {
    display: none;
  }
  ::v-deep .knowledge-graph > svg {
    min-height: 0;
  }
  ::v-deep .graph-node text {
    font-size: 16px;
    paint-order: stroke;
    stroke: #041524;
    stroke-width: 4px;
    stroke-linejoin: round;
  }
}
.scene-origin {
  position: absolute;
  left: 50%;
  top: 76%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 9px;
  z-index: 4;
  white-space: nowrap;
  font-size: 10px;
  letter-spacing: 1px;
  color: #9ed8ed;
  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: @cyan;
    box-shadow: 0 0 18px @cyan;
  }
}
.scene-caption {
  position: absolute;
  right: 4%;
  bottom: -7%;
  width: min(340px, 86%);
  padding: 16px 20px;
  border-left: 1px solid #39bbe779;
  background: linear-gradient(100deg, #0b2b40e6, #071f303b);
  z-index: 4;
  transition: opacity 0.4s;
  strong {
    display: block;
    margin: 6px 0;
    color: @text;
    font-size: 18px;
    font-weight: 500;
  }
  p {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.8;
    color: #b5cfe0;
  }
  small {
    font-size: 10px;
    color: #7399b3;
  }
}
.scene-caption-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8daec3;
  font-size: 10px;
  letter-spacing: 1px;
}
.scene-book-fallback {
  position: absolute;
  inset: 30% 20% 15%;
  display: grid;
  place-items: center;
  color: #63d2ff;
  filter: drop-shadow(0 0 24px #16d4ff66);
}
.is-intro {
  cursor: pointer;
  .scene-pages {
    opacity: 0.85;
    transform: translateY(-7%) scale(1);
  }
  .scene-map,
  .scene-caption {
    opacity: 0;
    pointer-events: none;
  }
  .scene-spine {
    opacity: 0.3;
  }
  .scene-origin {
    opacity: 0;
  }
}
.is-reduced {
  .scene-layers {
    will-change: auto;
  }
  .scene-book,
  .scene-pages,
  .scene-map {
    transition: none;
  }
}
@media (max-width: 767px) {
  .scene-caption {
    bottom: -22%;
    right: 5%;
    padding: 12px 16px;
    width: 78%;
    strong {
      font-size: 16px;
    }
    p {
      font-size: 11px;
    }
    small {
      font-size: 9px;
    }
  }
  .scene-map::v-deep .graph-node text {
    font-size: 19px;
  }
  .scene-origin {
    display: none;
  }
}
</style>
