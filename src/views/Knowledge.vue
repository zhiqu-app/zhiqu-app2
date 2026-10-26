<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>看清知识之间的关系</h1>
        <p>
          {{
            graph && graph.goal
              ? graph.goal
              : "选择课程，按照自己的学习任务设置知识点和先后关系。"
          }}
        </p>
      </div>
      <router-link
        :to="state.mode === 'demo' ? '/login' : graphEditorPath"
        class="button secondary"
      >
        {{ currentCourse ? "配置课程星图" : "创建课程" }}
      </router-link>
    </header>
    <label v-if="state.courses.length" class="knowledge-course-choice"
      >选择课程<select
        v-model="activeCourseId"
        aria-label="选择课程"
        class="input"
        @change="changeCourse"
      >
        <option
          v-for="course in state.courses"
          :key="course.id"
          :value="course.id"
        >
          {{ course.name }}
        </option>
      </select></label
    >
    <p v-if="graphLoading" class="panel" role="status">正在读取课程星图…</p>
    <p v-else-if="graphError" class="error-message" role="alert">
      {{ graphError }}
      <button class="text-button" @click="prepareGraph">重新加载</button>
    </p>
    <div v-else-if="graph" class="content-with-aside">
      <section class="panel knowledge-panel">
        <div class="panel-heading">
          <h2>{{ graph.title }}</h2>
          <span class="muted small">点击节点探索</span>
        </div>
        <KnowledgeGraph
          v-if="nodes.length"
          :title="graph.title"
          :nodes="nodes"
          :edges="graph.edges"
          :selected="selected ? selected.id : ''"
          @select="selectedId = $event.id"
        />
        <p v-else class="muted">
          这门课程还没有知识点，点击「配置课程星图」即可手动添加。
        </p>
        <div class="knowledge-hint">
          <AppIcon
            name="info"
            :size="18"
          />知识点和连接由你设定，连线表示先后关系。任务完成情况不等于知识掌握评分。
        </div>
        <div class="knowledge-cards">
          <button
            v-for="n in nodes"
            :key="n.id"
            class="knowledge-card"
            :class="{ active: selected && selected.id === n.id }"
            @click="selectedId = n.id"
          >
            <AppIcon name="book" /><strong>{{ n.label }}</strong
            ><span>查看学习内容</span>
          </button>
        </div>
      </section>
      <aside class="right-rail">
        <section v-if="selected" class="panel">
          <span class="badge amber">正在探索</span>
          <h2 class="selected-node-title">{{ selected.label }}</h2>
          <p>
            {{
              selected.description ||
              "这个知识点暂时没有说明，可先阅读相关课程资料。"
            }}
          </p>
          <div v-if="selected.taskId" class="knowledge-task">
            <strong>{{ selected.taskTitle }}</strong>
            <p>{{ selected.taskDone ? "关联任务已完成" : "关联任务待完成" }}</p>
            <router-link to="/app/plan" class="text-button"
              >查看复习任务</router-link
            >
          </div>
          <div class="button-stack">
            <router-link
              :to="{ path: '/app/studio', query: { course: graph.courseId } }"
              class="button secondary"
            >
              <AppIcon name="file" :size="18" />回看课程资料
            </router-link>
            <router-link to="/app/practice" class="button primary">
              <AppIcon name="edit" :size="18" />开始巩固练习
            </router-link>
          </div>
        </section>
        <section class="panel">
          <h2>把理解连成线</h2>
          <p class="muted">
            先看定义，再读一个例子。遇到不清楚的地方，带着问题回到原文。
          </p>
          <router-link to="/app/plan" class="text-button"
            >加入你的复习节奏
            <AppIcon name="arrow" :size="16" />
          </router-link>
        </section>
      </aside>
    </div>
    <section v-else class="panel empty-state">
      <h2>{{ currentCourse ? "为这门课程设置知识点" : "先添加你的课程" }}</h2>
      <p>课程资料和星图可以分步整理，不需要登录时一次配置完成。</p>
      <router-link
        :to="state.mode === 'demo' ? '/login' : graphEditorPath"
        class="button primary"
        >{{ currentCourse ? "配置课程星图" : "创建课程" }}</router-link
      >
    </section>
  </div>
</template>
<script>
import KnowledgeGraph from "../components/KnowledgeGraph.vue";
import { state } from "../store";
import courseGraph from "../mixins/courseGraph";
export default {
  name: "Knowledge",
  components: { KnowledgeGraph },
  mixins: [courseGraph],
  data: () => ({ state, selectedId: "" }),
  computed: {
    nodes() {
      return this.graph?.nodes || [];
    },
    selected() {
      return (
        this.nodes.find((node) => node.id === this.selectedId) ||
        this.nodes[0] ||
        null
      );
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */
.knowledge-course-choice {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  color: @muted;
  select {
    width: auto;
    max-width: 75%;
    background: @bg;
    color: @text;
  }
}
.knowledge-task {
  padding: 16px 0;
  margin-bottom: 16px;
  border-top: 1px solid @border;
  color: @amber;
  p {
    font-size: 12px;
    color: @muted;
  }
}

.knowledge-panel {
  padding: 24px;

  > .knowledge-graph {
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
  .knowledge-panel > .knowledge-graph {
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
