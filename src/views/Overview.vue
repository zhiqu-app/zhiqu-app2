<template>
  <div>
    <header class="page-heading overview-heading">
      <div>
        <span class="eyebrow">学习不是赶路，是一点点看清方向</span>
        <h1>今天，从一个清晰点开始</h1>
        <p>
          {{
            state.settings.name
          }}，欢迎回来。把理解留给今天，把进步留在记录里。
        </p>
      </div>
      <span class="date-label">
        <AppIcon name="calendar" :size="18" />{{ today }}
      </span>
    </header>
    <div class="content-with-aside">
      <section>
        <article class="panel overview-graph">
          <div class="panel-heading">
            <div>
              <h2>我的知识星图</h2>
              <p class="muted small">
                {{ graph ? graph.title : "每门课程都可以有自己的学习路线" }}
              </p>
            </div>
            <router-link
              :to="{
                path: '/app/knowledge',
                query: activeCourseId ? { course: activeCourseId } : {},
              }"
              class="text-button"
              >完整路线
              <AppIcon name="arrow" :size="16" />
            </router-link>
          </div>
          <label v-if="state.courses.length" class="overview-course-choice"
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
          <p v-if="graphLoading" class="muted" role="status">
            正在读取课程星图…
          </p>
          <p v-else-if="graphError" class="error-message" role="alert">
            {{ graphError }}
            <button class="text-button" @click="prepareGraph">重新加载</button>
          </p>
          <KnowledgeGraph
            v-else-if="graph && graph.nodes.length"
            :title="graph.title"
            :nodes="graph.nodes"
            :edges="graph.edges"
            :selected="selectedNodeId"
            @select="select"
          />
          <div v-else class="overview-graph-empty">
            <p>
              {{
                currentCourse
                  ? "这门课程还没有知识点，可根据学习任务手动配置。"
                  : "先创建课程，再导入资料或配置知识星图。"
              }}
            </p>
            <router-link
              :to="state.mode === 'demo' ? '/login' : graphEditorPath"
              class="button secondary"
            >
              {{
                state.mode === "demo"
                  ? "登录账号"
                  : currentCourse
                    ? "配置课程星图"
                    : "创建课程"
              }}
            </router-link>
          </div>
          <router-link
            v-if="graph && !graphLoading && !graphError"
            :to="graphEditorPath"
            class="text-button"
            >编辑本课程知识点与关系</router-link
          >
        </article>
        <section
          v-if="state.mode !== 'account' || overview"
          class="panel stat-strip"
        >
          <div>
            <span>我的课程</span
            ><strong>
              <AnimatedNumber :value="totalCourses" /> <small>门</small>
            </strong>
          </div>
          <div>
            <span>已作答</span
            ><strong>
              <AnimatedNumber :value="attemptCount" />
              <small>次</small>
            </strong>
          </div>
          <div>
            <span>正确率</span
            ><strong>
              <AnimatedNumber v-if="attemptCount" :value="rate" /><template
                v-else
                >—</template
              ><small>{{ attemptCount ? "%" : "" }}</small>
            </strong>
          </div>
          <div>
            <span>待完成计划</span
            ><strong>
              <AnimatedNumber :value="pendingCount" /> <small>项</small>
            </strong>
          </div>
        </section>
        <p v-else-if="overviewError" class="error-message" role="alert">
          {{ overviewError }}
          <button class="text-button" @click="readStats">重新读取统计</button>
        </p>
        <p v-else class="panel muted" role="status">正在读取学习统计…</p>
        <div class="section-heading">
          <h2>继续学习</h2>
          <router-link to="/app/courses" class="text-button"
            >查看全部
            <AppIcon name="arrow" :size="16" />
          </router-link>
        </div>
        <CourseCard
          v-for="course in courses"
          :key="course.id"
          :course="course"
          :material-count="
            state.materials.filter((m) => m.courseId === course.id).length
          "
          @archive="archive"
        />
      </section>
      <aside class="right-rail">
        <section class="panel">
          <div class="panel-heading">
            <h2>今日复习</h2>
            <router-link to="/app/plan" class="text-button"
              >管理计划</router-link
            >
          </div>
          <div
            v-for="(task, i) in tasks.slice(0, 3)"
            :key="task.id"
            class="task-compact"
          >
            <span class="step-circle">{{ i + 1 }}</span>
            <div>
              <strong>{{ task.title }}</strong
              ><small
                >{{ task.minutes }} 分钟 · {{ task.date || "随时开始" }}</small
              ><router-link :to="task.target || '/app/plan'" class="text-button"
                >开始学习
                <AppIcon name="chevron" :size="14" />
              </router-link>
            </div>
          </div>
          <p v-if="!tasks.length" class="muted">
            今天的任务都已完成，给自己一点休息时间。
          </p>
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>问一个学习问题</h2>
            <AppIcon name="spark" />
          </div>
          <p class="muted">
            {{ graph ? graph.goal : "带着自己的问题，从课程资料中寻找线索。" }}
          </p>
          <router-link
            :to="
              graph
                ? { path: '/app/studio', query: { course: graph.courseId } }
                : '/app/studio'
            "
            class="button secondary full-width"
            >进入研习室
            <AppIcon name="arrow" :size="18" />
          </router-link>
        </section>
        <section class="panel tip-card">
          <AppIcon name="spark" />
          <h2>给学习一点耐心</h2>
          <p>比起一次学很多，每次理解得更清楚一点，也是一种扎实的进步。</p>
          <div class="wave-decoration" />
        </section>
      </aside>
    </div>
  </div>
</template>
<script>
import KnowledgeGraph from "../components/KnowledgeGraph.vue";
import CourseCard from "../components/CourseCard.vue";
import { state, persist, notify } from "../store";
import courseGraph from "../mixins/courseGraph";
import { loadTasks, archiveCourse } from "../services/courses";
import { loadOverview } from "../services/questions";
export default {
  name: "Overview",
  components: { KnowledgeGraph, CourseCard },
  mixins: [courseGraph],
  data: () => ({
    state,
    selected: "",
    overview: null,
    overviewError: "",
    today: new Date().toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }),
  }),
  computed: {
    totalCourses() {
      return state.mode === "account"
        ? this.overview?.totalCourses || 0
        : state.courses.length;
    },
    attemptCount() {
      return state.mode === "account"
        ? this.overview?.attemptCount || 0
        : state.attempts.length;
    },
    pendingCount() {
      return state.mode === "account"
        ? this.overview?.pendingTasks || 0
        : this.tasks.length;
    },
    selectedNodeId() {
      const nodes = this.graph?.nodes || [];
      return nodes.some((node) => node.id === this.selected)
        ? this.selected
        : nodes[0]?.id || "";
    },
    courses() {
      return state.courses.filter((c) => !c.archived).slice(0, 2);
    },
    tasks() {
      return state.tasks.filter((t) => !t.done);
    },
    rate() {
      if (state.mode === "account") return this.overview?.correctRate || 0;
      return state.attempts.length
        ? Math.round(
            (state.attempts.filter((a) => a.correct).length /
              state.attempts.length) *
              100,
          )
        : "—";
    },
  },
  methods: {
    async readStats() {
      if (state.mode !== "account") return;
      this.overviewError = "";
      try {
        this.overview = await loadOverview();
      } catch (error) {
        this.overviewError = error.message;
      }
    },
    select(node) {
      this.selected = node.id;
      notify("已选择「" + node.label + "」，可在完整路线中查看详情。");
    },
    async archive(c) {
      if (state.mode === "account" && c._remote) {
        try {
          await archiveCourse(c, !c.archived);
        } catch (error) {
          notify(error.message);
        }
        return;
      }
      c.archived = !c.archived;
      persist();
    },
  },
  async created() {
    this.readStats();
    try {
      await loadTasks();
    } catch (error) {
      notify(error.message);
    }
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.overview-graph-empty {
  padding: 40px 0;
  color: @muted;
  p {
    margin-bottom: 20px;
  }
}
.overview-course-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  color: @muted;
  font-size: 13px;
  select {
    width: auto;
    max-width: 70%;
    background: @bg;
    color: @text;
  }
}

.overview-heading {
  padding: 10px 0;

  h1 {
    font-size: 32px;
  }

  .date-label {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    color: #97bbd9;
  }
}

.overview-graph .panel-heading {
  margin-bottom: 0;
}

.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px 12px;
  margin-top: 16px;

  > div {
    text-align: center;
    border-right: 1px solid #1d3d52;

    &:last-child {
      border-right: 0;
    }

    > span {
      display: block;
      color: #88b0d0;
      font-size: 12px;
    }

    strong {
      font-size: 25px;
      color: #c8e6ff;
      line-height: 1.6;
    }

    small {
      font-size: 12px;
      color: #80abc9;
      font-weight: normal;
    }
  }
}

.task-compact {
  display: flex;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid #17364d;

  &:last-child {
    border: 0;
  }

  strong {
    font-size: 13px;
    font-weight: 500;
    display: block;
  }

  small {
    display: block;
    color: #7fa6c5;
    font-size: 11px;
    margin: 3px 0;
  }

  .text-button {
    font-size: 11px;
  }
}

.step-circle {
  width: 23px;
  height: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #228fc3;
  border-radius: 50%;
  font-size: 11px;
  color: #9fe8ff;
  background: #0f5372;
  flex: none;
}

@media (max-width: 767px) {
  .overview-heading h1 {
    font-size: 26px;
  }

  .overview-heading .date-label {
    font-size: 11px;
  }

  .stat-strip {
    gap: 0;
    padding: 14px 5px;

    > div > span {
      font-size: 10px;
    }

    > div strong {
      font-size: 22px;
    }
  }
}
</style>
