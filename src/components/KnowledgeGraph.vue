<template>
  <div
    class="knowledge-graph"
    :data-phase="phase"
    :class="{ 'motion-static': motionReduced }"
  >
    <svg viewBox="0 0 760 300" role="img" :aria-label="title">
      <defs>
        <filter :id="glowId" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <marker
          :id="glowId + '-arrow'"
          viewBox="0 0 10 10"
          refX="15"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path
            d="M 0 1 L 9 5 L 0 9"
            fill="none"
            stroke="#55c5ed"
            stroke-width="1.5"
          />
        </marker>
      </defs>
      <path
        v-for="(edge, i) in validEdges"
        :key="i"
        class="graph-link"
        :class="{ 'is-active': touchesSelection(edge) }"
        :d="line(edge)"
        stroke="#207fc0"
        fill="none"
        stroke-width="1.6"
        :marker-end="
          phase === 'flowing' || phase === 'static'
            ? 'url(#' + glowId + '-arrow)'
            : null
        "
      />
      <g class="graph-flow" aria-hidden="true" pointer-events="none">
        <g
          v-for="(edge, i) in flowEdges"
          :key="i"
          class="graph-packet"
          :class="{ 'is-active': touchesSelection(edge) }"
        >
          <circle r="7" class="packet-halo" :filter="'url(#' + glowId + ')'" />
          <circle r="2.6" class="packet-core" />
        </g>
      </g>
      <!-- 光圈与知识节点是 SVG 同级元素，key 必须使用不同前缀。 -->
      <g
        v-if="selectedNode"
        :key="'selection-' + selectedNode.id"
        class="selection-ripples"
        :transform="'translate(' + selectedNode.x + ' ' + selectedNode.y + ')'"
        aria-hidden="true"
        pointer-events="none"
      >
        <circle
          v-for="wave in 2"
          :key="wave"
          class="selection-wave"
          r="15"
          fill="none"
          stroke="#ffc777"
          vector-effect="non-scaling-stroke"
        />
        <circle class="selection-aura" r="24" fill="#ffc777" opacity=".06" />
      </g>
      <g
        v-for="(node, i) in nodes"
        :key="'node-' + node.id"
        class="graph-node"
        :class="{ 'is-selected': activeSelected === node.id }"
        role="button"
        tabindex="0"
        :aria-label="node.label"
        :aria-pressed="activeSelected === node.id ? 'true' : 'false'"
        @click="choose(node)"
        @keydown.enter.prevent="choose(node)"
        @keydown.space.prevent="choose(node)"
      >
        <!-- 扩大点击区域，包含文字与光点之间的空隙，键盘交互仍由外层节点负责。 -->
        <circle
          class="node-hit"
          :cx="node.x"
          :cy="node.y"
          r="26"
          fill="transparent"
          pointer-events="all"
        />
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="activeSelected === node.id ? 19 : 13"
          :fill="activeSelected === node.id ? '#ffbd57' : '#00bffa'"
          opacity=".45"
          :filter="'url(#' + glowId + ')'"
        />
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="activeSelected === node.id ? 8 : 6"
          :fill="activeSelected === node.id ? '#ffe6a9' : '#94eeff'"
        />
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="activeSelected === node.id ? 17 : 12"
          :stroke="activeSelected === node.id ? '#ffc777' : '#32bcff'"
          fill="none"
        />
        <text
          :x="node.x"
          :y="node.y + (i % 2 ? -26 : 35)"
          text-anchor="middle"
          fill="#bad7f0"
          font-size="15"
        >
          {{ node.label }}
        </text>
      </g>
    </svg>
    <div class="graph-legend">
      <span> <i class="dot cyan" />课程知识点</span>
      <span> <i class="dot amber" />当前选中 </span>
      <span>知识关系</span>
    </div>
  </div>
</template>
<script>
import { motionAllowed } from "../utils/motion";
import { navigation } from "../utils/navigation";
import { createGraphAnimation } from "../utils/graphAnimation";
export default {
  name: "KnowledgeGraph",
  // 只负责绘制和选择；业务数据统一由父页面从当前账号接口传入。
  props: {
    title: { type: String, default: "知识点之间的关系" },
    selected: { type: String, default: undefined },
    nodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] },
  },
  data: () => ({
    localSelected: "",
    phase: "waiting",
    inViewport: false,
    pageHidden: document.hidden,
  }),
  computed: {
    activeSelected() {
      return this.selected === undefined ? this.localSelected : this.selected;
    },
    selectedNode() {
      return this.nodes.find((node) => node.id === this.activeSelected);
    },
    motionReduced() {
      return !motionAllowed();
    },
    canPlay() {
      return (
        this.inViewport &&
        !this.pageHidden &&
        !navigation.overlayVisible &&
        !navigation.overlayLeaving
      );
    },
    flowEdges() {
      return this.validEdges.slice(0, 24);
    },
    graphSignature() {
      return JSON.stringify([
        this.nodes.map((n) => [n.id, n.x, n.y]),
        this.validEdges,
      ]);
    },
    validEdges() {
      return this.edges.filter(
        (edge) =>
          Array.isArray(edge) &&
          edge.length === 2 &&
          edge.every(
            (index) =>
              Number.isInteger(index) &&
              this.nodes[index] &&
              Number.isFinite(Number(this.nodes[index].x)) &&
              Number.isFinite(Number(this.nodes[index].y)),
          ),
      );
    },
    glowId() {
      return "graph-glow-" + this._uid;
    },
  },
  watch: {
    graphSignature() {
      this._hasDrawn = false;
      this.queueAnimation(true);
    },
    motionReduced() {
      this.queueAnimation(false);
    },
    canPlay(value) {
      this._animation?.setPlaying(value);
    },
    activeSelected() {
      this.$nextTick(() => {
        if (!this._isDestroyed) this._animation?.select();
      });
    },
  },
  mounted() {
    this._animation = createGraphAnimation(this.$el, (value) => {
      this.phase = value;
      if (value === "flowing" || value === "static") this._hasDrawn = true;
    });
    this._visibility = () => {
      this.pageHidden = document.hidden;
    };
    document.addEventListener("visibilitychange", this._visibility);
    if ("IntersectionObserver" in window) {
      this._observer = new IntersectionObserver(
        (entries) => {
          this.inViewport = entries[0].isIntersecting;
        },
        { threshold: 0.06 },
      );
      this._observer.observe(this.$el);
    } else this.inViewport = true;
    this.queueAnimation(true);
  },
  beforeDestroy() {
    cancelAnimationFrame(this._frame);
    this._observer?.disconnect();
    document.removeEventListener("visibilitychange", this._visibility);
    this._animation?.destroy();
  },
  methods: {
    choose(node) {
      if (this.selected === undefined) this.localSelected = node.id;
      this.$emit("select", node);
    },
    touchesSelection(edge) {
      return edge.some((index) => this.nodes[index].id === this.activeSelected);
    },
    queueAnimation(replay) {
      if (!this._animation) return;
      this._replay = this._replay || replay;
      cancelAnimationFrame(this._frame);
      this._frame = requestAnimationFrame(() =>
        this.$nextTick(() => {
          if (this._isDestroyed) return;
          this._animation.setPlaying(this.canPlay);
          this._animation.rebuild({
            reduced: this.motionReduced,
            draw: !!this._replay && !this._hasDrawn,
          });
          this._replay = false;
        }),
      );
    },
    line(edge) {
      const a = this.nodes[edge[0]],
        b = this.nodes[edge[1]];
      return `M${a.x},${a.y} L${b.x},${b.y}`;
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.knowledge-graph {
  position: relative;
  width: 100%;
  // 视觉样式留在组件；GSAP 仅控制路径偏移、透明度、光点位置和扩散半径。
  &[data-phase="waiting"] .graph-link {
    opacity: 0;
  }
  .graph-link {
    stroke: #207fc0;
    stroke-linecap: round;
    transition:
      stroke 0.2s,
      stroke-width 0.2s;
    pointer-events: none;
    &.is-active {
      stroke: #e2b46d;
      stroke-width: 2;
    }
  }
  .graph-packet {
    opacity: 0;
    .packet-halo {
      fill: #32bcff;
      opacity: 0.65;
    }
    .packet-core {
      fill: #d6faff;
    }
    &.is-active {
      .packet-halo {
        fill: #ffc777;
      }
      .packet-core {
        fill: #fff0cb;
      }
    }
  }
  .selection-wave {
    opacity: 0;
    stroke-width: 1.2;
  }
  .graph-node.is-selected text {
    fill: #ffe6a9;
    font-weight: 600;
  }
  .node-hit {
    stroke: none !important;
  }
  &.motion-static {
    .graph-packet,
    .selection-wave {
      opacity: 0 !important;
    }
  }
  > svg {
    display: block;
    width: 100%;
    min-height: 200px;
    overflow: visible;
  }
  .graph-node {
    cursor: pointer;
    &:hover circle {
      stroke: white;
    }
    &:focus {
      outline: none;
      circle:last-of-type {
        stroke: white;
        stroke-width: 3px;
      }
    }
  }
  .graph-legend {
    display: flex;
    gap: 20px;
    align-items: center;
    color: #8eb3d1;
    font-size: 10px;
    padding: 0 3px 9px;
    > span {
      display: inline-flex;
      gap: 7px;
      align-items: center;
    }
    > span:last-child {
      margin-left: auto;
    }
  }
}
@media (max-width: 767px) {
  .knowledge-graph {
    > svg {
      min-height: 160px;
    }
    .graph-legend {
      font-size: 9px;
      gap: 12px;
      > span:last-child {
        display: none;
      }
    }
  }
}
</style>
