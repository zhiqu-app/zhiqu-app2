<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>看清知识之间的关系</h1>
        <p>以线性代数为例，从一个知识点出发，找到下一步。</p>
      </div>
      <span class="badge">示例知识路线</span>
    </header>
    <div class="content-with-aside">
      <section class="panel knowledge-panel">
        <div class="panel-heading">
          <h2>线性代数</h2>
          <span class="muted small">点击节点探索</span>
        </div>
        <KnowledgeGraph :selected="selected.id" @select="selected = $event" />
        <div class="knowledge-hint">
          <AppIcon name="info" :size="18" />节点连线为内置学习示意，不代表自动解析所有课程。
        </div>
        <div class="knowledge-cards">
          <button v-for="n in nodes" :key="n.id" class="knowledge-card" :class="{ active: selected.id === n.id }"
            @click="selected = n">
            <AppIcon name="book" /><strong>{{ n.label }}</strong><span>查看学习内容</span>
          </button>
        </div>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <span class="badge amber">正在探索</span>
          <h2 class="selected-node-title">{{ selected.label }}</h2>
          <p>
            {{ descriptions[selected.id] || '从定义与基本运算开始，建立理解，再通过例题检验。' }}
          </p>
          <div class="button-stack">
            <router-link to="/app/studio?course=linear" class="button secondary">
              <AppIcon name="file" :size="18" />回看课程资料
            </router-link>
            <router-link to="/app/practice" class="button primary">
              <AppIcon name="edit" :size="18" />开始巩固练习
            </router-link>
          </div>
        </section>
        <section class="panel">
          <h2>把理解连成线</h2>
          <p class="muted">先看定义，再读一个例子。遇到不清楚的地方，带着问题回到原文。</p>
          <router-link to="/app/plan" class="text-button">加入你的复习节奏
            <AppIcon name="arrow" :size="16" />
          </router-link>
        </section>
      </aside>
    </div>
  </div>
</template>
<script>
import KnowledgeGraph from '../components/KnowledgeGraph.vue'
export default {
  name: 'Knowledge',
  components: { KnowledgeGraph },
  data: () => ({
    selected: { id: 'eigen', label: '特征值' },
    nodes: [
      { id: 'matrix', label: '矩阵' },
      { id: 'operation', label: '矩阵运算' },
      { id: 'linear', label: '线性方程组' },
      { id: 'eigen', label: '特征值' },
      { id: 'vector', label: '特征向量' },
      { id: 'diagonal', label: '对角化' }
    ],
    descriptions: {
      eigen:
        '如果存在非零向量 v 使 Av = λv，λ 就是矩阵 A 的特征值。对角矩阵的特征值可以直接从主对角线读取。',
      vector: '特征向量是在线性变换下方向保持不变的非零向量，满足 Av = λv。',
      diagonal: '矩阵对角化把线性变换转为更容易理解的对角形式。需要找到足够多线性无关的特征向量。'
    }
  })
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.knowledge-panel {
  padding: 24px;

  >.knowledge-graph {
    margin-top: 40px;
    margin-bottom: 30px;
  }
}

.knowledge-hint {
  color: #7aa5c5;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 0;
  border-top: 1px solid #204057;
}

.knowledge-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.knowledge-card {
  border: 1px solid #244b65;
  background: #0b243a;
  border-radius: 6px;
  padding: 20px 10px;
  text-align: left;

  .app-icon {
    display: block;
    margin-bottom: 10px;
    color: #4aace9;
  }

  strong {
    font-size: 14px;
    display: block;
  }

  span {
    display: block;
    font-size: 11px;
    color: #78a4c4;
    margin-top: 7px;
  }

  &.active {
    border-color: #edb859;
    background: #3d301f35;

    .app-icon {
      color: @amber;
    }
  }
}

.selected-node-title {
  margin: 18px 0;
  font-size: 25px;
}

@media (max-width: 767px) {
  .knowledge-panel>.knowledge-graph {
    margin: 15px 0;
  }

  .knowledge-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .knowledge-hint {
    font-size: 11px;
  }

  .knowledge-panel {
    padding: 18px 15px;
  }
}
</style>
