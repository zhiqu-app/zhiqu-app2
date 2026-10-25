<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>让错题成为下一次进步的起点</h1>
        <p>把没想清楚的地方，变成下一步的学习方向。</p>
      </div>
      <router-link to="/app/practice" class="button primary">
        <AppIcon name="edit" :size="18" />开始练习
      </router-link>
    </header>
    <div class="filter-bar panel">
      <div class="tabs">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部错题</button>
        <button
          :class="{ active: filter === 'pending' }" @click="filter = 'pending'">
          待巩固</button>
          <button :class="{ active: filter === 'reviewed' }" @click="filter = 'reviewed'">
          已复习
        </button>
      </div>
      <span class="muted small">按题目归并 · 以最后一次作答判断掌握情况</span>
    </div>
    <div class="mistakes-layout">
      <section class="panel mistake-list">
        <button v-for="q in filtered" :key="q.id" class="mistake-item" :class="{ active: selectedId === q.id }"
          @click="selectedId = q.id">
          <span class="badge" :class="{ amber: !q.reviewed }">{{
            q.reviewed ? '已复习' : '待巩固'
            }}</span>
          <h3>{{ q.title }}</h3>
          <span class="muted small">{{ q.point }} · 错误 {{ q.wrongCount }} 次</span>
        </button>
        <div v-if="!filtered.length" class="empty-state">
          <AppIcon name="check" :size="40" />
          <h2>{{ mistakes.length ? '没有匹配的错题' : '还没有错题记录' }}</h2>
          <p>完成一次练习，记录就会出现在这里。</p>
        </div>
      </section>
      <section v-if="selected" class="panel mistake-detail">
        <span class="badge amber">{{ selected.point }}</span>
        <h2>{{ selected.title }}</h2>
        <div class="answer-options">
          <div v-for="(option, i) in selected.options" :key="i" class="answer-option"
            :class="{ correct: i === selected.answer, wrong: i === selected.lastWrong.choice }">
            <span class="option-letter">{{ 'ABCD'[i] }}</span>
            {{ option }}
            <AppIcon v-if="i === selected.answer" name="check" :size="16" />
          </div>
        </div>
        <h3>解析</h3>
        <p>{{ selected.explanation }}</p>
        <div class="button-row">
          <button class="button secondary" @click="addPlan(selected)">
            <AppIcon name="calendar" :size="18" />加入复习计划
          </button>
          <button class="button primary" @click="retry(selected)">
            再练一次
            <AppIcon name="arrow" :size="18" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
<script>
import { questions } from '../data/demo'
import { state, persist, uid, notify } from '../store'
export default {
  name: 'Mistakes',
  data: () => ({ state, filter: 'all', selectedId: '' }),
  computed: {
    mistakes() {
      return questions
        .map((q) => {
          const all = state.attempts.filter((a) => a.questionId === q.id)
          const wrong = all.filter((a) => !a.correct)
          return wrong.length
            ? {
              ...q,
              reviewed: all[all.length - 1].correct,
              wrongCount: wrong.length,
              lastWrong: wrong[wrong.length - 1]
            }
            : null
        })
        .filter(Boolean)
    },
    filtered() {
      return this.mistakes.filter(
        (q) => this.filter === 'all' || q.reviewed === (this.filter === 'reviewed')
      )
    },
    selected() {
      return this.filtered.find((q) => q.id === this.selectedId) || this.filtered[0]
    }
  },
  methods: {
    addPlan(q) {
      const title = '巩固：' + q.point + '（' + q.id + '）'
      if (state.tasks.some((t) => t.title === title && !t.done)) {
        notify('这道题已经在待复习计划中了。')
        return
      }
      state.tasks.push({
        id: uid(),
        title,
        description: q.title,
        minutes: 10,
        date: '',
        done: false,
        target: '/app/practice?question=' + q.id
      })
      persist()
      notify('已加入复习计划')
    },
    retry(q) {
      let draft = {}
      try {
        draft = JSON.parse(sessionStorage.getItem('zhixu-practice-draft')) || {}
      } catch (_) { }
      if (draft.answers) delete draft.answers[q.id]
      sessionStorage.setItem('zhixu-practice-draft', JSON.stringify(draft))
      this.$router.push('/app/practice?question=' + q.id)
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.mistakes-layout {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;
}

.mistake-list {
  padding: 8px;
}

.mistake-item {
  display: block;
  width: 100%;
  text-align: left;
  border-left: 2px solid transparent;
  padding: 20px 18px;
  border-radius: 5px;

  h3 {
    font-size: 14px;
    margin: 10px 0 8px;
  }

  &.active {
    border-color: @cyan;
    background: #163657;
  }
}

.mistake-detail {
  padding: 28px;

  h2 {
    font-size: 19px;
    margin: 18px 0 25px;
  }

  >h3 {
    margin: 25px 0 10px;
  }

  >p {
    color: #b1cfe7;
  }

  .button-row {
    margin-top: 26px;
  }
}

@media (max-width: 767px) {
  .mistakes-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .mistake-list {
    max-height: 260px;
    overflow-y: auto;
  }

  .mistake-detail {
    padding: 20px;
  }

  .mistake-list {
    padding: 18px 15px;
  }
}
</style>
