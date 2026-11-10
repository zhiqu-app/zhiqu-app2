<template>
  <div class="product-demo" :data-demo="step">
    <div class="demo-topbar">
      <span class="window-dots" aria-hidden="true"><i /><i /><i /></span><span>知序 / 线性代数</span>
      <span class="demo-badge">交互示例</span>
    </div>
    <transition name="demo-content" :css="!reduced" @before-enter="activatePanel" @before-leave="deactivatePanel">
      <div :key="step" class="demo-content" :data-demo-step="step">
        <transition name="guide-open" :css="!reduced" appear>
          <aside v-if="guide" class="demo-guide" :class="{ 'guide-motion': !reduced }" aria-label="操作引导">
            <div class="demo-guide-top">
              <span class="demo-guide-status">已完成 {{ guideCount }} / {{ guide.length }}</span>
              <button type="button" @click="$emit('exit-guide')">退出引导</button>
            </div>
            <div class="demo-guide-meter" aria-hidden="true">
              <i v-for="(done, index) in guide" :key="index" :class="{ done }" />
            </div>
            <p>{{ guideCount === guide.length ? "你已走完示例学习流程" : guideHint }}</p>
            <transition name="guide-complete" :css="!reduced">
              <button v-if="guideCount === guide.length" type="button" class="guide-workspace"
                @click="$emit('enter-workspace')">用自己的课程试试 <AppIcon name="arrow" :size="15" /></button>
            </transition>
          </aside>
        </transition>
        <template v-if="step === 0">
          <div class="demo-heading">
            <AppIcon name="file" :size="21" />
            <h3 tabindex="-1">课程资料</h3>
            <span>已归档</span>
          </div>
          <div class="demo-document">
            <aside>
              <span class="document-folder">
                <AppIcon name="book" :size="16" />线性代数
              </span>
              <button type="button" class="document-file" :class="{ active: isLecture }"
                :aria-pressed="String(isLecture)" @click="focusSource(); $emit('guide-action', 0)">
                <b>PDF</b><span>第三章讲义<small>矩阵与线性变换</small></span>
              </button>
              <button type="button" class="document-file" :class="{ active: !isLecture }"
                :aria-pressed="String(!isLecture)" @click="showNotes(); $emit('guide-action', 0)">
                <b>MD</b><span>课堂笔记<small>阅读时记下的问题</small></span>
              </button>
            </aside>
            <article class="demo-paper">
              <span>线性代数 / {{ isLecture ? '第三章' : '课堂笔记' }}</span>
              <h4 v-if="isLecture">变换中的<br />不变方向</h4>
              <h4 v-else>这个方向<br />发生了什么</h4>
              <p>{{ isLecture ? '先从一个向量出发，观察矩阵怎样改变它。' : '把定义代入一个具体例子，检查方向与倍数。' }}</p>
              <div class="paper-matrix">A v = λ v</div>
              <p v-if="isLecture" class="paper-highlight" :class="{ 'source-marked': sourceMarked }"
                tabindex="-1">{{ sourceText }}</p>
              <p v-else class="paper-highlight">当 Av = 3v 且 v ≠ 0 时，向量被拉长为原来的三倍，方向保持不变。</p>
              <div class="paper-lines"><i /><i /><i /></div>
              <small>{{ isLecture ? '课程讲义 · 示例片段' : '课堂笔记 · 示例记录' }}</small>
            </article>
          </div>
        </template>
        <template v-else-if="step === 1">
          <div class="demo-heading">
            <AppIcon name="graph" :size="21" />
            <h3 tabindex="-1">我的知识连接</h3>
            <span>手动配置</span>
          </div>
          <div class="demo-graph">
            <KnowledgeGraph title="课程星图交互示例" :nodes="nodes" :edges="edges" :selected="selected"
              @select="$emit('select-node', $event.id); $emit('guide-action', 1)" />
            <div class="demo-node-detail">
              <span>{{ selectedNode.label }}</span>
              <p>{{ selectedNode.description }}</p>
            </div>
          </div>
          <p class="demo-subnote">
            由你添加知识点、连接先后关系，可选关联复习任务。
          </p>
        </template>
        <template v-else-if="step === 2">
          <div class="demo-heading">
            <AppIcon name="spark" :size="21" />
            <h3 tabindex="-1">带着问题阅读</h3>
            <span>资料答疑</span>
          </div>
          <div class="demo-chat">
            <div class="chat-source">
              <AppIcon name="file" :size="19" /><span>第三章讲义.pdf</span><small>阅读中的原文</small>
              <blockquote>{{ sourceText }}</blockquote>
            </div>
            <div class="demo-question">
              <span>我的问题</span>
              <p>特征向量为什么是一个特别的方向？</p>
            </div>
            <button v-if="!answered" class="demo-action" @click="showAnswer">
              查看示例回答
              <AppIcon name="arrow" :size="17" />
            </button>
            <div v-else class="demo-answer" aria-live="polite">
              <span>
                <AppIcon name="spark" :size="17" />结合原文理解
              </span>
              <p>
                矩阵 A 作用后，向量 v 只变成原来的 λ
                倍，仍然在同一条直线上。这就是这个方向的特别之处。
              </p>
              <button type="button" class="answer-citation" @click="$emit('guide-action', 2); $emit('source')">
                <AppIcon name="file" :size="14" />查看原文 · 第三章
                <AppIcon name="arrow" :size="14" />
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="demo-heading">
            <AppIcon name="edit" :size="21" />
            <h3 tabindex="-1">用一道题，验证理解</h3>
            <span>单选题</span>
          </div>
          <div class="demo-practice">
            <span class="question-kicker">特征值与特征向量</span>
            <h4>若 Av = 3v，v ≠ 0，<br />那么 v 是什么？</h4>
            <div class="demo-options">
              <button v-for="(option, i) in options" :key="i" :aria-label="option" :class="{
                chosen: choice === i,
                correct: choice === i && i === 0,
              }" :aria-pressed="String(choice === i)" @click="choice = i">
                <b>{{ "ABC"[i] }}</b>{{ option
                }}
                <AppIcon v-if="choice === i && i === 0" name="check" :size="17" />
              </button>
            </div>
            <div v-if="choice !== null" class="practice-feedback" aria-live="polite">
              <strong>{{
                choice === 0 ? "理解得很准确" : "再对照一下定义"
              }}</strong>
              <p>Av = 3v 符合特征向量的定义，其中对应的特征值为 3。</p>
              <button v-if="!planned" class="demo-action" @click="addPlan">
                加入示例复习计划
                <AppIcon name="calendar" :size="16" />
              </button><span v-else class="planned" tabindex="-1">
                <AppIcon name="check" :size="16" />示例复习已安排
              </span>
            </div>
            <p v-else class="demo-subnote">点击一个选项，试试你的理解。</p>
          </div>
        </template>
        <button v-if="step < nextLabels.length" type="button" class="demo-next" @click="$emit('advance', step + 1)">
          <small>下一步</small>{{ nextLabels[step] }}<AppIcon name="arrow" :size="16" />
        </button>
      </div>
    </transition>
    <div class="demo-footer">
      <span><i />{{
        step === 0
          ? "资料保存到课程"
          : step === 1
            ? "知识关系由你设定"
            : step === 2
              ? "回答结合资料引用"
              : "练习连接下一次复习"
      }}</span><small>示例操作不会保存到账号</small>
    </div>
  </div>
</template>
<script>
import KnowledgeGraph from "../KnowledgeGraph.vue";
import { productNodes, productEdges } from "../../data/productDemo";
import { motionAllowed } from "../../utils/motion";
export default {
  name: "ProductDemo",
  components: { KnowledgeGraph },
  props: {
    step: { type: Number, default: 0 },
    selected: { type: String, default: "product-eigen" },
    guide: { type: Array, default: null },
    contained: Boolean,
  },
  data: () => ({
    nodes: productNodes,
    edges: productEdges,
    documentKey: "lecture",
    sourceMarked: false,
    sourceText: "当 v ≠ 0 且 Av = λv 时，v 是矩阵 A 的特征向量，λ 是对应的特征值。",
    nextLabels: ["看知识关系", "带着问题读", "试一道练习"],
    answered: false,
    choice: null,
    planned: false,
    options: ["对应特征值 3 的特征向量", "矩阵 A 的逆矩阵", "零向量"],
  }),
  computed: {
    isLecture() {
      return this.documentKey === "lecture";
    },
    selectedNode() {
      return this.nodes.find((n) => n.id === this.selected) || this.nodes[0];
    },
    reduced() {
      return !motionAllowed();
    },
    guideCount() {
      return this.guide.filter(Boolean).length;
    },
    guideHint() {
      const hints = [
        ["点选讲义或课堂笔记，看看课程资料。", "资料已打开，可以接着看知识关系。"],
        ["点一个星图节点，看看知识点的说明。", "已查看知识点，接下来带着问题阅读。"],
        [this.answered ? "点「查看原文」，回到引用段落。" : "打开示例回答，找找它引用了哪段讲义。", "已定位引用段落。"],
        [this.choice === null ? "选一个答案，看看解析，再把这题加入复习。" : "点击「加入示例复习计划」，留到下次复习。", "已安排示例复习。"],
      ];
      return hints[this.step][Number(this.guide[this.step])];
    },
  },
  methods: {
    activatePanel(panel) {
      panel.removeAttribute("inert");
    },
    deactivatePanel(panel) {
      panel.setAttribute("inert", "");
    },
    focusHeading() {
      this.$el.querySelector(`[data-demo-step="${this.step}"]:not([inert]) h3`)?.focus({ preventScroll: true });
    },
    showAnswer() {
      this.answered = true;
      if (!this.guide) return;
      this.$nextTick(() => {
        const citation = this.$el.querySelector(".demo-content:not([inert]) .answer-citation");
        if (citation) this.reveal(citation);
      });
    },
    addPlan() {
      this.planned = true;
      this.$emit("guide-action", 3);
      if (!this.guide) return;
      this.$nextTick(() => {
        const finish = this.$el.querySelector(".demo-content:not([inert]) .guide-workspace");
        if (finish) this.reveal(finish);
        else this.$el.querySelector(".planned")?.focus({ preventScroll: true });
      });
    },
    focusSource() {
      this.documentKey = "lecture";
      this.sourceMarked = true;
      this.$nextTick(() => {
        if (this.step !== 0 || this._isDestroyed) return;
        const passage = this.$el.querySelector('[data-demo-step="0"]:not([inert]) .paper-highlight');
        if (passage) this.reveal(passage);
      });
    },
    reveal(target) {
      const behavior = this.reduced ? "auto" : "smooth";
      target.focus({ preventScroll: true });
      if (!this.contained) {
        target.scrollIntoView({ block: "nearest", behavior });
        return;
      }
      // 桌面只滚动演示窗口，避免带动页面滚动并触发其它章节。
      const panel = target.closest(".demo-content");
      const bounds = target.getBoundingClientRect();
      const top = panel.scrollTop + bounds.top - panel.getBoundingClientRect().top;
      panel.scrollTo({ top: top - (panel.clientHeight - bounds.height) / 2, behavior });
    },
    showNotes() {
      this.documentKey = "notes";
      this.sourceMarked = false;
    },
  },
};
</script>
<style lang="less" scoped>
@import "../../styles/tokens.less";

/* 产品示例的资料、答疑和练习共用舞台，状态只保存在页面中。 */
.product-demo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background: #081e30;
  border: 1px solid #21465e;
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 30px 90px #0003;
  color: #d1e0ec;
}

.demo-topbar {
  grid-row: 1;
  padding: 16px 20px;
  border-bottom: 1px solid #1e3d52;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 10px;
  color: #7b9eb7;
  background: #0b263a;
}

.window-dots {
  display: flex;
  gap: 5px;

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #34586e;

    &:first-child {
      background: #4c7e8d;
    }
  }
}

.demo-badge {
  margin-left: auto;
  font-size: 9px;
  padding: 2px 7px;
  border: 1px solid #315466;
  border-radius: 3px;
  color: #7ccada;
}

.demo-content {
  grid-row: 2;
  grid-column: 1;
  min-width: 0;
  min-height: 400px;
  padding: 26px;
}

.demo-guide {
  margin-bottom: 22px;
  padding: 10px 12px 12px;
  border-left: 2px solid @cyan;
  background: #102f43;
  color: #d8eef8;
  font-size: 13px;

  p { margin: 9px 0 0; line-height: 1.55; }
}

.demo-guide-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  button {
    min-height: 44px;
    padding: 0 5px;
    color: #b2d2e5;
    font-size: 12px;
    &:hover, &:focus-visible { text-decoration: underline; }
  }
}

.demo-guide-status { color: #8ce1f4; font-variant-numeric: tabular-nums; }

.demo-guide-meter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;

  i {
    height: 3px;
    background: #35576a;

    &::after {
      content: "";
      display: block;
      height: 100%;
      background: @cyan;
      transform: scaleX(0);
      transform-origin: left center;
      transition-property: none;
    }

    &.done::after { transform: scaleX(1); }
  }

  .guide-motion & i::after {
    transition: transform 260ms ease-out;
  }
}

.guide-workspace {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  gap: 8px;
  color: #8ce1f4;
  &:hover, &:focus-visible { text-decoration: underline; }
}

.guide-motion .guide-workspace {
  .app-icon { transition: transform 180ms ease-out; }
  &:hover .app-icon, &:focus-visible .app-icon { transform: translateX(3px); }
  &:active .app-icon { transform: translateX(1px); }
}

.guide-open-enter-active { animation: guide-enter 240ms ease-out; }
.guide-complete-enter-active { animation: guide-finish 280ms ease-out; }

@keyframes guide-enter {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes guide-finish {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.demo-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 24px;
  color: @cyan;

  h3 {
    font-size: 16px;
    font-weight: 500;
    color: #d8e9f4;
    margin: 0;
  }

  span {
    font-size: 9px;
    margin-left: auto;
    padding: 3px 7px;
    background: #143a48;
    color: #80c6c3;
    border-radius: 3px;
  }
}

.demo-document {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 20px;

  aside {
    padding-top: 8px;
  }
}

.document-folder {
  display: flex;
  gap: 7px;
  align-items: center;
  color: #94bbd1;
  font-size: 11px;
  margin-bottom: 16px;
}

.document-file {
  display: flex;
  width: 100%;
  gap: 8px;
  align-items: center;
  font-size: 10px;
  padding: 13px 6px;
  border-radius: 5px;
  color: #7097ad;
  margin: 5px 0;
  text-align: left;

  &:hover, &:focus-visible { background: #102f43; color: #d2e5f0; }

  &.active {
    background: #12344a;
    color: #d2e5f0;
  }

  b {
    font-size: 8px;
    color: #58cce9;
    border: 1px solid #356a7d;
    padding: 5px 3px;
    font-weight: 500;
  }

  small {
    display: block;
    font-size: 8px;
    color: #6b9ab3;
    margin-top: 3px;
  }
}

.demo-paper {
  background: #e9f0f3;
  color: #244254;
  padding: 25px 25px 18px;
  min-height: 320px;
  box-shadow: 0 10px 22px #0002;
  border-radius: 3px;

  >span {
    font-size: 8px;
    color: #6b8897;
    letter-spacing: 1px;
  }

  h4 {
    font-size: 25px;
    line-height: 1.35;
    font-weight: 500;
    margin: 17px 0;
  }

  p {
    font-size: 9px;
    line-height: 1.9;
    color: #6b828c;
  }

  small {
    font-size: 8px;
    color: #899ba3;
  }
}

.paper-matrix {
  font-family: Georgia, serif;
  font-size: 26px;
  color: #1a6a82;
  letter-spacing: 4px;
  margin: 15px 0;
}

.paper-highlight {
  background: #d4e7e9;
  padding: 9px;
  border-left: 2px solid #4ba2b8;

  &.source-marked {
    background: #ffe7a8;
    border-color: #a76c21;
    color: #433416;
  }
  &:focus { outline: 2px solid #a76c21; outline-offset: 2px; }
}

.paper-lines {
  margin-bottom: 18px;

  i {
    display: block;
    height: 3px;
    background: #d3dfe4;
    width: 100%;
    margin: 6px 0;

    &:last-child {
      width: 70%;
    }
  }
}

.demo-graph {
  padding-top: 15px;

  ::v-deep .graph-legend {
    font-size: 8px;
  }

  ::v-deep .knowledge-graph>svg {
    min-height: 175px;
  }
}

.demo-node-detail {
  border-left: 1px solid #58bbd2;
  padding-left: 14px;
  margin-top: 12px;

  span {
    font-size: 13px;
    color: #d9e7ef;
  }

  p {
    font-size: 11px;
    color: #80a9bf;
    margin: 5px 0;
  }
}

.demo-subnote {
  font-size: 10px;
  line-height: 1.8;
  color: #7197ae;
  margin: 20px 0 0;
}

.demo-chat {
  font-size: 12px;
}

.chat-source {
  background: #0d2a3f;
  border: 1px solid #21485f;
  padding: 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #8acbdf;

  small {
    margin-left: auto;
    font-size: 9px;
    color: #638da6;
  }

  blockquote {
    width: 100%;
    margin: 7px 0 0;
    border-left: 2px solid #3a8da5;
    padding-left: 12px;
    color: #a9c7d8;
    font-size: 11px;
    line-height: 1.9;
  }
}

.demo-question {
  padding: 16px 0;

  span {
    font-size: 9px;
    color: #7098ae;
  }

  p {
    font-size: 13px;
    color: #ccdde7;
    margin: 6px 0 0;
  }
}

.demo-action {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  border-bottom: 1px solid #2e6a7e;
  padding: 7px 0;
  color: #74d6ec;
  font-size: 11px;
}

.demo-answer {
  padding: 16px;
  background: #0b2b3d;
  border-radius: 5px;
  border: 1px solid #1a4a5c;

  >span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #60c6df;
    font-size: 10px;
  }

  p {
    font-size: 11px;
    line-height: 2;
    color: #b3d0df;
    margin: 9px 0;
  }
}

.answer-citation {
  display: flex;
  gap: 6px;
  align-items: center;
  border-top: 1px solid #224655;
  padding-top: 10px;
  font-size: 9px;
  color: #78a8bc;
  padding-inline: 0;
  min-height: 36px;
  &:hover, &:focus-visible { color: #c2efff; }
}

.question-kicker {
  font-size: 9px;
  color: #6998b0;
}

.demo-practice h4 {
  font-size: 22px;
  line-height: 1.6;
  font-weight: 500;
  color: #d7e8f3;
  margin: 10px 0 20px;
}

.demo-options {
  display: grid;
  gap: 9px;

  button {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 12px;
    background: #0c293e;
    border: 1px solid #24465a;
    border-radius: 5px;
    text-align: left;
    font-size: 11px;

    b {
      display: grid;
      place-items: center;
      width: 23px;
      height: 23px;
      border: 1px solid #345b6d;
      color: #8eb2c5;
      font-size: 10px;
      font-weight: 400;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .app-icon {
      margin-left: auto;
    }

    &.chosen {
      border-color: @amber;
    }

    &.correct {
      border-color: #3b9f9d;
      color: #a5dfd1;
      background: #103a42;
    }
  }
}

.practice-feedback {
  margin-top: 18px;

  strong {
    font-size: 12px;
    color: #8fd9c7;
    font-weight: 500;
  }

  p {
    font-size: 10px;
    color: #7dabbf;
    margin: 7px 0;
  }
}

.planned {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  color: #8fd9c7;
  margin-top: 12px;
}

.demo-footer {
  grid-row: 3;
  border-top: 1px solid #1c3c50;
  padding: 14px 20px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  color: #6d97af;

  span {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  i {
    height: 4px;
    width: 4px;
    border-radius: 50%;
    background: #43aeb7;
  }

  small {
    font-size: 8px;
    color: #4d7b94;
  }
}

.demo-next {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 44px;
  margin-top: 18px;
  padding: 8px 12px;
  border: 1px solid #23536d;
  border-radius: 6px;
  background: #0e2b40;
  color: #d8effa;
  font-size: 12px;
  text-align: left;

  small { color: #8ab5c9; font-size: 10px; }
  .app-icon { margin-left: auto; color: @cyan; }
  &:hover, &:focus-visible { background: #163b52; }
}

.demo-content-enter-active,
.demo-content-leave-active {
  transition:
    opacity 0.22s,
    transform 0.22s;
}

.demo-content-enter-active { z-index: 1; }
.demo-content-leave-active { pointer-events: none; }

.demo-content-enter {
  opacity: 0;
  transform: translateY(9px);
}

.demo-content-leave-to {
  opacity: 0;
  transform: translateY(-7px);
}

@media (max-width: 767px) {
  .demo-topbar {
    padding: 13px;
    gap: 9px;
    font-size: 9px;
  }

  .demo-content {
    padding: 18px;
    min-height: 0;
  }

  .demo-heading {
    margin-bottom: 19px;

    h3 {
      font-size: 14px;
    }
  }

  .demo-document {
    grid-template-columns: 1fr;

    aside {
      display: flex;
      gap: 6px;
      padding-top: 0;
    }

    .document-folder { display: none; }
    .document-file { min-width: 0; min-height: 44px; margin: 0; }
    .document-file small { display: none; }
  }

  .demo-paper {
    padding: 22px;
    min-height: 280px;
  }

  .demo-footer {
    padding: 12px;
    flex-wrap: wrap;
    gap: 5px;
  }

  .demo-practice h4 {
    font-size: 20px;
  }

  .demo-options button {
    font-size: 10px;
    padding: 10px 8px;
    gap: 8px;
  }

  .demo-graph::v-deep .knowledge-graph>svg {
    min-height: 150px;
  }

  .chat-source {
    small {
      width: 100%;
      margin-left: 27px;
    }
  }
}
</style>
