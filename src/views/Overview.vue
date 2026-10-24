<template>
  <div>
    <header class="page-heading overview-heading">
      <div>
        <span class="eyebrow">学习不是赶路，是一点点看清方向</span>
        <h1>今天，从一个清晰点开始</h1>
        <p>{{ state.settings.name }}，欢迎回来。把理解留给今天，把进步留在记录里。</p>
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
              <p class="muted small">线性代数 · 点击节点，继续探索</p>
            </div>
            <router-link to="/app/knowledge" class="text-button">完整路线
              <AppIcon name="arrow" :size="16" />
            </router-link>
          </div>
          <KnowledgeGraph :selected="selected" @select="select" />
        </article>
        <section class="panel stat-strip">
          <div>
            <span>我的课程</span><strong>
              <AnimatedNumber :value="state.courses.length" /> <small>门</small>
            </strong>
          </div>
          <div>
            <span>已作答</span><strong>
              <AnimatedNumber :value="state.attempts.length" /> <small>次</small>
            </strong>
          </div>
          <div>
            <span>正确率</span><strong>
              <AnimatedNumber v-if="state.attempts.length" :value="rate" /><template v-else>—</template><small>{{
                state.attempts.length ? '%' : '' }}</small>
            </strong>
          </div>
          <div>
            <span>待完成计划</span><strong>
              <AnimatedNumber :value="tasks.length" /> <small>项</small>
            </strong>
          </div>
        </section>
        <div class="section-heading">
          <h2>继续学习</h2>
          <router-link to="/app/courses" class="text-button">查看全部
            <AppIcon name="arrow" :size="16" />
          </router-link>
        </div>
        <CourseCard v-for="course in courses" :key="course.id" :course="course"
          :material-count="state.materials.filter((m) => m.courseId === course.id).length" @archive="archive" />
      </section>
      <aside class="right-rail">
        <section class="panel">
          <div class="panel-heading">
            <h2>今日复习</h2>
            <router-link to="/app/plan" class="text-button">管理计划</router-link>
          </div>
          <div v-for="(task, i) in tasks.slice(0, 3)" :key="task.id" class="task-compact">
            <span class="step-circle">{{ i + 1 }}</span>
            <div>
              <strong>{{ task.title }}</strong><small>{{ task.minutes }} 分钟 · {{ task.date || '随时开始'
                }}</small><router-link :to="task.target || '/app/plan'" class="text-button">开始学习
                <AppIcon name="chevron" :size="14" />
              </router-link>
            </div>
          </div>
          <p v-if="!tasks.length" class="muted">今天的任务都已完成，给自己一点休息时间。</p>
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>问一个学习问题</h2>
            <AppIcon name="spark" />
          </div>
          <p class="muted">对角矩阵的特征值怎么求？试试从课程资料中找线索。</p>
          <router-link to="/app/studio?course=linear" class="button secondary full-width">进入研习室
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
import KnowledgeGraph from '../components/KnowledgeGraph.vue'
import CourseCard from '../components/CourseCard.vue'
import { state, persist, notify } from '../store'
export default {
  name: 'Overview',
  components: { KnowledgeGraph, CourseCard },
  data: () => ({
    state,
    selected: 'eigen',
    today: new Date().toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }),
  computed: {
    courses() {
      return state.courses.filter((c) => !c.archived).slice(0, 2)
    },
    tasks() {
      return state.tasks.filter((t) => !t.done)
    },
    rate() {
      return state.attempts.length
        ? Math.round((state.attempts.filter((a) => a.correct).length / state.attempts.length) * 100)
        : '—'
    }
  },
  methods: {
    select(node) {
      this.selected = node.id
      notify('已选择「' + node.label + '」，可在完整路线中查看详情。')
    },
    archive(c) {
      c.archived = !c.archived
      persist()
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

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

  >div {
    text-align: center;
    border-right: 1px solid #1d3d52;

    &:last-child {
      border-right: 0;
    }

    >span {
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

    >div>span {
      font-size: 10px;
    }

    >div strong {
      font-size: 22px;
    }
  }
}
</style>
