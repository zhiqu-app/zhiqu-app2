<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>看清知识之间的关系</h1>
        <p>{{ graph ? graph.goal : '登录并选择学习方向，建立属于你的知识路线。' }}</p>
      </div>
      <router-link :to="graph ? '/setup-knowledge' : '/login'" class="button secondary">
        {{ graph ? '调整学习配置' : '登录并配置星图' }}
      </router-link>
    </header>
    <div v-if="graph" class="content-with-aside">
      <section class="panel knowledge-panel">
        <div class="panel-heading">
          <h2>{{ graph.title }}</h2>
          <span class="muted small">点击节点探索</span>
        </div>
        <KnowledgeGraph v-if="nodes.length" :title="graph.title" :nodes="nodes" :edges="graph.edges"
          :selected="selected ? selected.id : ''" @select="selectedId = $event.id" />
        <p v-else class="muted">这条路线暂时没有知识点，可调整学习配置后再试。</p>
        <div class="knowledge-hint">
          <AppIcon name="info" :size="18" />路线按课程目录建立，可点击节点查看说明，再结合资料逐步学习。
        </div>
        <div class="knowledge-cards">
          <button v-for="n in nodes" :key="n.id" class="knowledge-card" :class="{ active: selected && selected.id === n.id }"
            @click="selectedId = n.id">
            <AppIcon name="book" /><strong>{{ n.label }}</strong><span>查看学习内容</span>
          </button>
        </div>
      </section>
      <aside class="right-rail">
        <section v-if="selected" class="panel">
          <span class="badge amber">正在探索</span>
          <h2 class="selected-node-title">{{ selected.label }}</h2>
          <p>
            {{ selected.description || '这个知识点暂时没有说明，可先阅读相关课程资料。' }}
          </p>
          <div class="button-stack">
            <router-link :to="{ path: '/app/studio', query: { course: graph.courseId } }" class="button secondary">
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
import { state } from '../store'
export default {
  name: 'Knowledge',
  components: { KnowledgeGraph },
  data: () => ({ state, selectedId: '' }),
  computed: {
    graph() { return this.state.mode === 'account' ? this.state.knowledgeGraph : null },
    nodes() { return this.graph?.nodes || [] },
    selected() { return this.nodes.find(node => node.id === this.selectedId) || this.nodes[0] || null }
  }
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
