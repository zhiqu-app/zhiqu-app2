<template>
  <div class="knowledge-graph">
    <svg viewBox="0 0 760 300" role="img" :aria-label="title">
      <defs>
        <filter :id="glowId"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path v-for="(edge, i) in validEdges" :key="i" :d="line(edge)" stroke="#207fc0" fill="none" />
      <g v-for="(node, i) in nodes"
        :key="node.id"
        class="graph-node"
        role="button"
        tabindex="0"
        :aria-label="node.label"
        :aria-pressed="selected === node.id ? 'true' : 'false'"
        @click="$emit('select', node)"
        @keydown.enter.prevent="$emit('select', node)"
        @keydown.space.prevent="$emit('select', node)"
      >
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="selected === node.id ? 19 : 13"
          :fill="selected === node.id ? '#ffbd57' : '#00bffa'"
          opacity=".45"
          :filter="'url(#' + glowId + ')'"/>
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="selected === node.id ? 8 : 6"
          :fill="selected === node.id ? '#ffe6a9' : '#94eeff'"/>
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="selected === node.id ? 17 : 12"
          :stroke="selected === node.id ? '#ffc777' : '#32bcff'"
          fill="none"/>
        <text
          :x="node.x"
          :y="node.y + (i % 2 ? -26 : 35)"
          text-anchor="middle"
          fill="#bad7f0"
          font-size="15">
          {{ node.label }}
        </text>
      </g>
    </svg>
    <div class="graph-legend">
      <span>
        <i class="dot cyan" />课程知识点</span>
        <span>
            <i class="dot amber" />当前选中
        </span>
        <span>知识关系</span>
    </div>
  </div>
</template>
<script>
export default {
  name: 'KnowledgeGraph',
  // 只负责绘制和选择；业务数据统一由父页面从当前账号接口传入。
  props: {
    title: { type: String, default: '知识点之间的关系' },
    selected: { type: String, default: '' },
    nodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] }
  },
  computed: {
    validEdges() {
      return this.edges.filter(edge => Array.isArray(edge) && edge.length === 2 &&
        edge.every(index => Number.isInteger(index) && this.nodes[index]))
    },
    glowId() {
      return 'graph-glow-' + this._uid
    }
  },
  methods: {
    line(edge) {
      const a = this.nodes[edge[0]],
        b = this.nodes[edge[1]]
      return `M${a.x},${a.y} L${b.x},${b.y}`
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.knowledge-graph {
  position: relative;
  width: 100%;
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
