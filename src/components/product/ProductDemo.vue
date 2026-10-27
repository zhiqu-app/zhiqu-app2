<template>
  <div class="product-demo" :data-demo="step">
    <div class="demo-topbar">
      <span class="window-dots" aria-hidden="true"><i /><i /><i /></span
      ><span>知序 / 线性代数</span><span class="demo-badge">交互示例</span>
    </div>
    <transition name="demo-content" mode="out-in" :css="!reduced"
      ><div :key="step" class="demo-content">
        <template v-if="step === 0"
          ><div class="demo-heading">
            <AppIcon name="file" :size="21" />
            <h3>课程资料</h3>
            <span>已归档</span>
          </div>
          <div class="demo-document">
            <aside>
              <span class="document-folder"
                ><AppIcon name="book" :size="16" />线性代数</span
              >
              <div class="document-file active">
                <b>PDF</b><span>第三章讲义<small>矩阵与线性变换</small></span>
              </div>
              <div class="document-file">
                <b>MD</b><span>课堂笔记<small>阅读时记下的问题</small></span>
              </div>
            </aside>
            <article class="demo-paper">
              <span>线性代数 / 第三章</span>
              <h4>变换中的<br />不变方向</h4>
              <p>先从一个向量出发，观察矩阵怎样改变它。</p>
              <div class="paper-matrix">A v = λ v</div>
              <p class="paper-highlight">
                当 v ≠ 0 且 Av = λv 时，v 是矩阵 A 的特征向量。
              </p>
              <div class="paper-lines"><i /><i /><i /></div>
              <small>课程讲义 · 示例片段</small>
            </article>
          </div></template
        >
        <template v-else-if="step === 1"
          ><div class="demo-heading">
            <AppIcon name="graph" :size="21" />
            <h3>我的知识连接</h3>
            <span>手动配置</span>
          </div>
          <div class="demo-graph">
            <KnowledgeGraph
              title="课程星图交互示例"
              :nodes="nodes"
              :edges="edges"
              :selected="selected"
              @select="selected = $event.id"
            />
            <div class="demo-node-detail">
              <span>{{ selectedNode.label }}</span>
              <p>{{ selectedNode.description }}</p>
            </div>
          </div>
          <p class="demo-subnote">
            由你添加知识点、连接先后关系，可选关联复习任务。
          </p></template
        >
        <template v-else-if="step === 2"
          ><div class="demo-heading">
            <AppIcon name="spark" :size="21" />
            <h3>带着问题阅读</h3>
            <span>资料答疑</span>
          </div>
          <div class="demo-chat">
            <div class="chat-source">
              <AppIcon name="file" :size="19" /><span>第三章讲义.pdf</span
              ><small>阅读中的原文</small>
              <blockquote>
                当 v ≠ 0 且 Av = λv 时，<br />v 是矩阵 A 的特征向量。
              </blockquote>
            </div>
            <div class="demo-question">
              <span>我的问题</span>
              <p>特征向量为什么是一个特别的方向？</p>
            </div>
            <button
              v-if="!answered"
              class="demo-action"
              @click="answered = true"
            >
              查看示例回答<AppIcon name="arrow" :size="17" />
            </button>
            <div v-else class="demo-answer" aria-live="polite">
              <span><AppIcon name="spark" :size="17" />结合原文理解</span>
              <p>
                矩阵 A 作用后，向量 v 只变成原来的 λ
                倍，仍然在同一条直线上。这就是这个方向的特别之处。
              </p>
              <div class="answer-citation">
                <AppIcon name="file" :size="14" />原文依据 · 第三章
              </div>
            </div>
          </div></template
        >
        <template v-else
          ><div class="demo-heading">
            <AppIcon name="edit" :size="21" />
            <h3>用一道题，验证理解</h3>
            <span>单选题</span>
          </div>
          <div class="demo-practice">
            <span class="question-kicker">特征值与特征向量</span>
            <h4>若 Av = 3v，v ≠ 0，<br />那么 v 是什么？</h4>
            <div class="demo-options">
              <button
                v-for="(option, i) in options"
                :key="i"
                :aria-label="option"
                :class="{
                  chosen: choice === i,
                  correct: choice === i && i === 0,
                }"
                :aria-pressed="String(choice === i)"
                @click="choice = i"
              >
                <b>{{ "ABC"[i] }}</b
                >{{ option
                }}<AppIcon
                  v-if="choice === i && i === 0"
                  name="check"
                  :size="17"
                />
              </button>
            </div>
            <div
              v-if="choice !== null"
              class="practice-feedback"
              aria-live="polite"
            >
              <strong>{{
                choice === 0 ? "理解得很准确" : "再对照一下定义"
              }}</strong>
              <p>Av = 3v 符合特征向量的定义，其中对应的特征值为 3。</p>
              <button
                v-if="!planned"
                class="demo-action"
                @click="planned = true"
              >
                加入示例复习计划<AppIcon name="calendar" :size="16" /></button
              ><span v-else class="planned"
                ><AppIcon name="check" :size="16" />示例复习已安排</span
              >
            </div>
            <p v-else class="demo-subnote">点击一个选项，试试你的理解。</p>
          </div></template
        >
      </div></transition
    >
    <div class="demo-footer">
      <span
        ><i />{{
          step === 0
            ? "资料保存到课程"
            : step === 1
              ? "知识关系由你设定"
              : step === 2
                ? "回答结合资料引用"
                : "练习连接下一次复习"
        }}</span
      ><small>示例操作不会保存到账号</small>
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
  props: { step: { type: Number, default: 0 } },
  data: () => ({
    nodes: productNodes,
    edges: productEdges,
    selected: "product-matrix",
    answered: false,
    choice: null,
    planned: false,
    options: ["对应特征值 3 的特征向量", "矩阵 A 的逆矩阵", "零向量"],
  }),
  computed: {
    selectedNode() {
      return this.nodes.find((n) => n.id === this.selected) || this.nodes[0];
    },
    reduced() {
      return !motionAllowed();
    },
  },
};
</script>
<style lang="less" scoped>
@import "../../styles/tokens.less";
/* 与真实业务隔离的产品预览，所有选题/答疑/计划状态仅存在当前组件内。 */
.product-demo {
  background: #081e30;
  border: 1px solid #21465e;
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 30px 90px #0003;
  color: #d1e0ec;
}
.demo-topbar {
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
  min-height: 400px;
  padding: 26px;
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
  gap: 8px;
  align-items: center;
  font-size: 10px;
  padding: 13px 6px;
  border-radius: 5px;
  color: #7097ad;
  margin: 5px 0;
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
  > span {
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
  ::v-deep .knowledge-graph > svg {
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
  > span {
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
.demo-content-enter-active,
.demo-content-leave-active {
  transition:
    opacity 0.22s,
    transform 0.22s;
}
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
      display: none;
    }
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
  .demo-graph::v-deep .knowledge-graph > svg {
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
