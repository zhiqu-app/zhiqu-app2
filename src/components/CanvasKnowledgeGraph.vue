<template>
  <div class="canvas-graph" @keydown.esc="cancelAction">
    <div class="canvas-graph-toolbar">
      <p :id="hintId" class="canvas-graph-hint" aria-live="polite">{{
        movingId ? "拖动或点击目标位置，也可用方向键调整、回车确认。"
          : editable ? "右键点击知识点，或选中后打开「节点操作」。"
            : "拖动画布，点选知识点。聚焦画布后也可用方向键移动。"
      }}</p>
      <div class="canvas-graph-tools" role="group" aria-label="星图视角">
        <button type="button" aria-label="缩小星图" :disabled="zoom <= minZoom" @click="changeZoom(-0.25)">−</button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <button type="button" aria-label="放大星图" :disabled="zoom >= maxZoom" @click="changeZoom(0.25)">+</button>
        <button type="button" class="canvas-graph-reset" @click="resetView">适应画布</button>
        <button v-if="movingId" type="button" @click="cancelAction">取消移动</button>
        <button v-else-if="editable" type="button" :disabled="!selectedPoint"
          @click="openNodeActions($event, selectedPoint)">节点操作</button>
      </div>
    </div>
    <div ref="viewport" class="canvas-graph-viewport"
      :class="{ 'is-panning': dragging && !movingId, 'is-placing': movingId }"
      :style="{ backgroundPosition: offsetX + 'px ' + offsetY + 'px' }" :data-phase="phase"
      role="group" :aria-label="title" :aria-describedby="hintId" tabindex="0"
      @pointerdown="startPan" @pointermove="movePan" @pointerup="finishPan" @pointercancel="finishPan"
      @pointerleave="cancelPendingPan" @lostpointercapture.self="finishPan" @keydown.self="panWithKeys">
      <canvas ref="canvas" aria-hidden="true" />
      <!-- 节点图形由 Canvas 绘制，原生按钮保留可读标签、点击范围和键盘选择。 -->
      <button v-for="point in validPoints" :key="point.node.id" type="button" class="canvas-graph-node"
        :style="{ left: point.x + 'px', top: point.y + 'px' }"
        :data-node-id="point.node.id" :aria-expanded="editable ? String(menu?.id === point.node.id) : null"
        :aria-pressed="point.node.id === activeSelected ? 'true' : 'false'"
        :aria-label="point.node.label" :title="point.node.label"
        @contextmenu="openNodeActions($event, point)" @keydown="nodeKeys($event, point)"
        @focus="keepNodeVisible(point)" @click="choose($event, point.node)">
        <span>{{ point.node.label }}</span>
      </button>
      <div v-if="menu" ref="menu" class="canvas-node-menu" role="group" aria-label="节点操作"
        :style="{ '--menu-x': menu.x + 'px', '--menu-y': menu.y + 'px' }" @pointerdown.stop>
        <button ref="moveAction" type="button" @click="startMove">
          <AppIcon name="edit" :size="16" />移动节点
        </button>
        <button type="button" class="canvas-delete-node" @click="deleteNode">
          <AppIcon name="trash" :size="16" />删除节点
        </button>
      </div>
    </div>
    <div class="canvas-graph-legend">
      <span><i class="dot cyan" />课程知识点</span>
      <span><i class="dot amber" />当前选中</span>
      <span>连线表示先后关系</span>
    </div>
  </div>
</template>

<script>
import { motionAllowed } from "../utils/motion";
import { navigation } from "../utils/navigation";
import { drawCanvasGraph, drawEnd } from "../utils/canvasGraphDrawing";

export default {
  name: "CanvasKnowledgeGraph",
  props: {
    title: { type: String, default: "知识点之间的关系" },
    selected: { type: String, default: undefined },
    nodes: { type: Array, default: () => [] },
    edges: { type: Array, default: () => [] },
    editable: Boolean,
  },
  data: () => ({
    localSelected: "",
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2.5,
    dragging: false,
    inViewport: false,
    pageHidden: document.hidden,
    phase: "waiting",
    menu: null,
    movingId: "",
    draftPosition: null,
  }),
  computed: {
    hintId() {
      return "canvas-graph-hint-" + this._uid;
    },
    activeSelected() {
      return this.selected === undefined ? this.localSelected : this.selected;
    },
    projection() {
      const spanX = this.width - 2 * Math.min(72, Math.max(30, this.width * 0.14));
      return {
        centerX: this.width / 2 + this.offsetX,
        centerY: this.height / 2 - 14 + this.offsetY,
        scaleX: Math.max(1, spanX) * this.zoom / 760,
        scaleY: Math.max(1, this.height - 104) * this.zoom / 300,
      };
    },
    points() {
      const { centerX, centerY, scaleX, scaleY } = this.projection;
      return this.nodes.map((node) => {
        const position = node.id === this.movingId && this.draftPosition ? this.draftPosition : node;
        const x = Number(position.x), y = Number(position.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return {
          node,
          x: centerX + (x - 380) * scaleX,
          y: centerY + (y - 150) * scaleY,
        };
      });
    },
    validPoints() {
      return this.points.filter(Boolean);
    },
    selectedPoint() {
      return this.validPoints.find((point) => point.node.id === this.activeSelected);
    },
    links() {
      return this.edges.flatMap((edge) => {
        if (!Array.isArray(edge) || edge.length !== 2) return [];
        const [from, to] = edge.map((index) => this.points[index]);
        return from && to && from !== to ? [{ from, to }] : [];
      });
    },
    graphSignature() {
      return JSON.stringify([this.nodes.map(({ id, x, y }) => [id, x, y]), this.edges]);
    },
    reduced() {
      return !motionAllowed();
    },
    canAnimate() {
      return this.inViewport && !this.pageHidden && !this.reduced &&
        !navigation.overlayVisible && !navigation.overlayLeaving;
    },
  },
  watch: {
    editable(value) {
      if (!value) {
        this.menu = null;
        this.cancelMove();
      }
    },
    points: "requestDraw",
    reduced: "requestDraw",
    canAnimate() {
      this._lastFrame = null;
      this.requestDraw();
    },
    activeSelected() {
      this._selectionStart = this._elapsed;
      this.requestDraw();
    },
    graphSignature() {
      this._elapsed = 0;
      this._selectionStart = 0;
      this._lastFrame = null;
      this.requestDraw();
    },
  },
  mounted() {
    this._ctx = this.$refs.canvas.getContext("2d");
    this._elapsed = 0;
    this._selectionStart = 0;
    this._lastFrame = null;
    this.resize();
    window.addEventListener("resize", this.resize);
    if ("ResizeObserver" in window) {
      this._resizeObserver = new ResizeObserver(this.resize);
      this._resizeObserver.observe(this.$refs.viewport);
    }
    if ("IntersectionObserver" in window) {
      this._observer = new IntersectionObserver(([entry]) => {
        this.inViewport = entry.isIntersecting;
      });
      this._observer.observe(this.$refs.viewport);
    } else {
      this.inViewport = true;
    }
    document.addEventListener("visibilitychange", this.updateVisibility);
    document.addEventListener("pointerdown", this.dismissOutside, true);
  },
  beforeDestroy() {
    cancelAnimationFrame(this._frame);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.updateVisibility);
    document.removeEventListener("pointerdown", this.dismissOutside, true);
    this._observer?.disconnect();
    this._resizeObserver?.disconnect();
  },
  methods: {
    updateVisibility() {
      this.pageHidden = document.hidden;
    },
    resize() {
      const { clientWidth, clientHeight } = this.$refs.viewport;
      this.width = clientWidth;
      this.height = clientHeight;
      this.requestDraw();
    },
    requestDraw() {
      if (this._ctx && !this._frame)
        this._frame = requestAnimationFrame(this.paint);
    },
    paint(timestamp) {
      this._frame = 0;
      if (!this.width || !this.height) return;
      if (this.canAnimate && this._lastFrame !== null)
        this._elapsed += Math.min(timestamp - this._lastFrame, 80) / 1000;
      this._lastFrame = this.canAnimate ? timestamp : null;
      const end = drawEnd(this.links.length);
      if (this.reduced) this._elapsed = Math.max(end, this._elapsed);
      this.phase = this.reduced ? "static" : this._elapsed >= end ? "flowing" : this.canAnimate ? "drawing" : "waiting";

      const canvas = this.$refs.canvas;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(this.width * ratio);
      const pixelHeight = Math.round(this.height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      this._ctx.setTransform(pixelWidth / this.width, 0, 0, pixelHeight / this.height, 0, 0);
      this._ctx.clearRect(0, 0, this.width, this.height);
      drawCanvasGraph(this._ctx, this.validPoints, this.links, this.activeSelected,
        this._elapsed, this._elapsed - this._selectionStart, this.reduced);
      if (this.canAnimate && (this.links.length || this.activeSelected)) this.requestDraw();
    },
    canvasPosition(event) {
      const viewport = this.$refs.viewport;
      const rect = viewport.getBoundingClientRect();
      return { x: event.clientX - rect.left - viewport.clientLeft, y: event.clientY - rect.top - viewport.clientTop };
    },
    openNodeActions(event, point) {
      if (!this.editable || !point) return;
      event.preventDefault();
      this.cancelMove();
      const anchor = event.type === "contextmenu" ? this.canvasPosition(event) : point;
      this.menu = { id: point.node.id, x: anchor.x, y: anchor.y };
      this.$emit("select", point.node);
      this.$nextTick(() => this.$refs.moveAction?.focus({ preventScroll: true }));
    },
    nodeKeys(event, point) {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
        this.openNodeActions(event, point);
    },
    dismissOutside(event) {
      if (this.menu && !this.$refs.menu?.contains(event.target)) this.menu = null;
      if (this.movingId && !this.$el.contains(event.target)) this.cancelMove();
    },
    cancelAction(event) {
      if (!this.menu && !this.movingId) return;
      event.preventDefault();
      event.stopPropagation();
      const id = this.menu?.id || this.movingId;
      this.menu = null;
      this.cancelMove();
      this.$nextTick(() => {
        const node = Array.from(this.$refs.viewport.querySelectorAll(".canvas-graph-node"))
          .find((button) => button.dataset.nodeId === id);
        node?.focus({ preventScroll: true });
      });
    },
    startMove() {
      this.movingId = this.menu.id;
      this.menu = null;
      this.$refs.viewport.focus({ preventScroll: true });
    },
    cancelMove() {
      if (!this.movingId) return;
      this.movingId = "";
      this.draftPosition = null;
      this._pointer = null;
      this.dragging = false;
    },
    deleteNode() {
      const id = this.menu.id;
      this.menu = null;
      this.$refs.viewport.focus({ preventScroll: true });
      this.$emit("delete-node", id);
    },
    updatePosition(x, y) {
      const { centerX, centerY, scaleX, scaleY } = this.projection;
      this.setDraft((x - centerX) / scaleX + 380, (y - centerY) / scaleY + 150);
    },
    setDraft(x, y) {
      this.draftPosition = {
        x: Math.min(760, Math.max(0, Math.round(x))),
        y: Math.min(300, Math.max(0, Math.round(y))),
      };
    },
    commitPosition() {
      if (!this.draftPosition) return;
      this.$emit("position-node", { id: this.movingId, ...this.draftPosition });
      this.cancelMove();
    },
    startPan(event) {
      if (!event.isPrimary || event.button !== 0) return;
      this._suppressClick = false;
      this._pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, left: this.offsetX, top: this.offsetY };
      if (this.movingId) {
        event.preventDefault();
        if (event.target.closest(".canvas-graph-node")?.dataset.nodeId === this.movingId)
          this._pointer.nodePoint = this.validPoints.find((point) => point.node.id === this.movingId);
      }
    },
    movePan(event) {
      const pointer = this._pointer;
      if (!pointer || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (!this.dragging) {
        if (Math.hypot(dx, dy) < 5) return;
        this.$refs.viewport.setPointerCapture(event.pointerId);
        this.dragging = true;
        this._suppressClick = true;
      }
      if (this.movingId) {
        const target = pointer.nodePoint
          ? { x: pointer.nodePoint.x + dx, y: pointer.nodePoint.y + dy }
          : this.canvasPosition(event);
        this.updatePosition(target.x, target.y);
      } else {
        this.offsetX = pointer.left + dx;
        this.offsetY = pointer.top + dy;
      }
    },
    finishPan(event) {
      const pointer = this._pointer;
      if (pointer?.id !== event.pointerId) return;
      if (this.movingId && event.type === "pointerup") {
        if (!pointer.nodePoint && !this.dragging) {
          const target = this.canvasPosition(event);
          this.updatePosition(target.x, target.y);
        }
        if (this.draftPosition) {
          this._suppressClick = true;
          this.commitPosition();
        }
      } else if (this.movingId) {
        this.draftPosition = null;
      }
      this._pointer = null;
      this.dragging = false;
    },
    cancelPendingPan(event) {
      if (!this.dragging) this.finishPan(event);
    },
    panWithKeys(event) {
      if (this.movingId && event.key === "Enter") {
        event.preventDefault();
        this.commitPosition();
        return;
      }
      const offset = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
      if (!offset) return;
      event.preventDefault();
      if (this.movingId) {
        const position = this.draftPosition || this.nodes.find((node) => node.id === this.movingId);
        if (position) this.setDraft(Number(position.x) + offset[0] * 10, Number(position.y) + offset[1] * 10);
      } else {
        this.offsetX += offset[0] * 40;
        this.offsetY -= offset[1] * 40;
      }
    },
    changeZoom(delta) {
      const next = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta));
      const ratio = next / this.zoom;
      this.offsetX *= ratio;
      this.offsetY *= ratio;
      this.zoom = next;
    },
    resetView() {
      this.offsetX = this.offsetY = 0;
      this.zoom = 1;
    },
    keepNodeVisible(point) {
      if (this._pointer) return;
      const x = Math.min(this.width - 42, Math.max(42, point.x));
      const y = Math.min(this.height - 60, Math.max(24, point.y));
      this.offsetX += x - point.x;
      this.offsetY += y - point.y;
    },
    choose(event, node) {
      if (event.detail && this._suppressClick) return;
      if (this.selected === undefined) this.localSelected = node.id;
      this.$emit("select", node);
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.canvas-graph { width: 100%; min-width: 0; }

.canvas-graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 8px;
}

.canvas-graph-hint { margin: 0; color: @muted; font-size: 11px; }

.canvas-graph-tools {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: @text;

  span { min-width: 40px; text-align: center; font-variant-numeric: tabular-nums; }

  button {
    min-width: 36px;
    min-height: 36px;
    padding: 0 8px;
    border: 1px solid #28516a;
    border-radius: 6px;
    background: #102f43;
    &:hover:not(:disabled) { background: #19435b; }
  }

  .canvas-graph-reset { margin-left: 4px; }
}

.canvas-graph-viewport {
  position: relative;
  height: clamp(260px, 39dvh, 380px);
  width: 100%;
  overflow: hidden;
  overflow: clip;
  border: 1px solid #24445d;
  border-radius: 8px;
  background: radial-gradient(circle, #254965 1px, transparent 1.2px) 0 0 / 22px 22px #091f31;
  cursor: grab;
  touch-action: none;
  user-select: none;

  > canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

  &.is-panning, &.is-panning button { cursor: grabbing; }
  &.is-placing, &.is-placing .canvas-graph-node { cursor: crosshair; }
}

.canvas-node-menu {
  position: absolute;
  z-index: 4;
  left: clamp(6px, var(--menu-x), calc(100% - 154px));
  top: clamp(6px, var(--menu-y), calc(100% - 105px));
  width: 148px;
  padding: 4px;
  border: 1px solid #365d75;
  border-radius: 8px;
  background: #0c2537;
  box-shadow: 0 8px 20px #001019aa;

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 4px;
    color: @text;
    font-size: 13px;
    text-align: left;
    &:hover, &:focus-visible { background: #184057; }
  }

  .canvas-delete-node { color: #ffadad; }
}

.canvas-graph-node {
  position: absolute;
  z-index: 1;
  width: clamp(44px, 23%, 96px);
  min-height: 44px;
  padding: 43px 2px 0;
  transform: translate(-50%, -22px);
  color: #bad7f0;
  font-size: 13px;
  line-height: 1.35;
  text-align: center;

  span {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  &[aria-pressed="true"] { color: #ffe6a9; font-weight: 600; z-index: 2; }
  &:hover, &:focus-visible { color: #f4faff; z-index: 3; }
}

.canvas-graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 8px;
  color: #8eb3d1;
  font-size: 10px;

  span { display: inline-flex; align-items: center; gap: 6px; }
}

@media (max-width: 767px) {
  .canvas-graph-tools button { min-height: 44px; }
  .canvas-graph-node { font-size: 11px; }
}
</style>
