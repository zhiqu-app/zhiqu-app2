<template>
  <div>
    <header class="page-heading">
      <div>
        <span class="eyebrow">线性代数 · 特征值与特征向量</span>
        <h1>{{ submitted ? '特征值 · 练习解析' : '特征值 · 巩固练习' }}</h1>
        <p>理解一个知识点，再向前走一步。</p>
      </div>
      <router-link to="/app/mistakes" class="button secondary">
        <AppIcon name="edit" :size="18" />错题本
      </router-link>
    </header>
    <div class="content-with-aside practice-layout">
      <section class="panel question-panel">
        <div class="question-status">
          <span>第 <strong>{{ index + 1 }}</strong> / {{ questions.length }} 题</span>
          <div class="progress-track">
            <i :style="{ width: ((index + 1) / questions.length) * 100 + '%' }" />
          </div>
          <span>
            <AppIcon name="clock" :size="16" />{{ time }}
          </span>
        </div>
        <div class="question-body">
          <span class="badge">单选题</span>
          <h2>{{ current.title }}</h2>
          <div class="answer-options" role="radiogroup" aria-label="选择答案">
            <label v-for="(option, i) in current.options" :key="i" class="answer-option" :class="{
              chosen: choice === i,
              correct: submitted && i === current.answer,
              wrong: submitted && choice === i && choice !== current.answer
            }"><input v-model="choice" type="radio" :value="i" :disabled="submitted" name="answer" /><span
                class="option-letter">{{ letters[i] }}</span><span>{{ option }}</span><span
                v-if="submitted && i === current.answer" class="badge">正确答案</span><span
                v-if="submitted && choice === i && choice !== current.answer" class="badge amber">你的答案</span></label>
          </div>
          <section v-if="submitted" class="answer-explanation" :class="{ incorrect: choice !== current.answer }"
            aria-live="polite">
            <h3>
              <AppIcon :name="choice === current.answer ? 'check' : 'info'" />{{
                choice === current.answer ? '理解得很准确' : '这次答错了，再看一眼原理'
              }}
            </h3>
            <p>{{ current.explanation }}</p>
            <router-link to="/app/studio?course=linear" class="source-chip">
              <AppIcon name="file" :size="16" />回看「线性代数 第三章讲义」
            </router-link>
            <p v-if="choice !== current.answer" class="small muted">本题已记录到错题本。</p>
          </section>
        </div>
        <footer class="question-actions">
          <button class="button secondary" :disabled="index === 0" @click="previous">上一题</button><span
            class="muted small">本地示例题库 · 本地判分</span><button v-if="!submitted" class="button primary"
            :disabled="choice === null" @click="submit">
            提交答案</button><button v-else class="button primary" @click="next">
            {{ index === questions.length - 1 ? '查看本次报告' : '下一题'
            }}
            <AppIcon name="arrow" :size="17" />
          </button>
        </footer>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <h2>题目目录</h2>
          <div class="question-directory">
            <button v-for="(q, i) in questions" :key="q.id"
              :class="{ current: index === i, answered: answers[q.id] !== undefined }"
              :aria-label="'跳转到第' + (i + 1) + '题'" @click="go(i)">
              <span>{{ i + 1 }}</span>{{ q.point }}
              <AppIcon v-if="answers[q.id] !== undefined" name="check" :size="16" />
            </button>
          </div>
        </section>
        <section class="panel tip-card">
          <h2>答题前，想一想</h2>
          <p>如果矩阵是对角矩阵，你能直接从主对角线得到什么信息？</p>
        </section>
      </aside>
    </div>
  </div>
</template>
<script>
import { questions } from '../data/demo'
import { saveAttempt, notify } from '../store'
const DRAFT = 'zhixu-practice-draft'
export default {
  name: 'Practice',
  data() {
    let draft = {}
    try {
      draft = JSON.parse(sessionStorage.getItem(DRAFT)) || {}
    } catch (_) { }
    const requested = questions.findIndex((q) => q.id === this.$route.query.question)
    const answers = draft.answers || {}
    const index =
      requested >= 0
        ? requested
        : Math.max(0, Math.min(Number(draft.index) || 0, questions.length - 1))
    const answered = answers[questions[index].id]
    return {
      questions,
      index,
      answers,
      choice: answered === undefined ? null : answered,
      submitted: answered !== undefined,
      finished: false,
      seconds: draft.seconds || 0,
      letters: ['A', 'B', 'C', 'D'],
      startedAt: 0
    }
  },
  computed: {
    current() {
      return questions[this.index]
    },
    time() {
      return (
        String(Math.floor(this.seconds / 60)).padStart(2, '0') +
        ':' +
        String(this.seconds % 60).padStart(2, '0')
      )
    }
  },
  mounted() {
    this.startedAt = this.seconds
    this.timer = setInterval(() => {
      if (!this.submitted) this.seconds++
    }, 1000)
  },
  beforeDestroy() {
    clearInterval(this.timer)
    if (!this.finished) this.saveDraft()
  },
  methods: {
    saveDraft() {
      try {
        sessionStorage.setItem(
          DRAFT,
          JSON.stringify({ index: this.index, answers: this.answers, seconds: this.seconds })
        )
      } catch (_) { }
    },
    submit() {
      if (this.choice === null || this.submitted) return
      saveAttempt(this.current.id, this.choice, Math.max(1, this.seconds - this.startedAt))
      this.$set(this.answers, this.current.id, this.choice)
      this.submitted = true
      this.saveDraft()
    },
    go(index) {
      this.index = index
      const answer = this.answers[this.current.id]
      this.choice = answer === undefined ? null : answer
      this.submitted = answer !== undefined
      this.startedAt = this.seconds
      this.saveDraft()
    },
    previous() {
      if (this.index) this.go(this.index - 1)
    },
    next() {
      if (this.index < questions.length - 1) this.go(this.index + 1)
      else {
        this.finished = true
        sessionStorage.removeItem(DRAFT)
        notify('本次练习记录已保存，可在报告中查看。')
        this.$router.push('/app/reports')
      }
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.question-panel {
  padding: 0;
  overflow: hidden;
}

.question-status {
  padding: 17px 24px;
  border-bottom: 1px solid #1b3c54;
  display: flex;
  align-items: center;
  gap: 20px;
  color: #a4c1dc;
  font-size: 12px;

  .progress-track {
    flex: 1;
    height: 5px;
  }

  strong {
    color: #56d9ff;
  }

  >span:last-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.question-body {
  padding: 28px 24px 35px;
  min-height: 400px;

  h2 {
    font-size: 19px;
    line-height: 1.9;
    margin: 22px 0;
  }
}

.answer-explanation {
  border: 1px solid #20738a;
  background: #0c344346;
  border-radius: 7px;
  padding: 20px;
  margin-top: 25px;

  h3 {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #4de1ec;
    margin-bottom: 10px;
    font-size: 16px;
  }

  p {
    color: #a4c9e2;
    font-size: 14px;
  }

  .small {
    font-size: 11px;
    margin: 15px 0 0;
  }

  &.incorrect h3 {
    color: #ffc370;
  }
}

.question-actions {
  border-top: 1px solid #24445c;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.question-directory {
  display: grid;
  gap: 8px;

  button {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 9px;
    text-align: left;
    color: #9cbedc;
    font-size: 13px;
    border: 1px solid transparent;
    border-radius: 5px;

    >span {
      width: 25px;
      height: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #15334a;
      border-radius: 50%;
    }

    .app-icon {
      margin-left: auto;
      color: #20cbe9;
    }

    &.current {
      border-color: #1c6f9c;
      background: #0b3851;
      color: #d4f4ff;
    }

    &.answered>span {
      background: #125e80;
    }
  }
}

@media (max-width: 767px) {
  .question-status {
    padding: 14px;
    gap: 12px;
    font-size: 11px;
  }

  .question-body {
    padding: 23px 16px;
    min-height: 0;

    h2 {
      font-size: 17px;
    }
  }

  .answer-explanation {
    padding: 16px;

    h3 {
      font-size: 14px;
    }

    p {
      font-size: 13px;
    }
  }

  .question-actions {
    padding: 14px;
    position: sticky;
    bottom: 0;
    background: #0b2337;

    >.small {
      display: none;
    }
  }

  .practice-layout .right-rail {
    display: none;
  }

  .question-panel {
    padding: 18px 15px;
  }
}
</style>
