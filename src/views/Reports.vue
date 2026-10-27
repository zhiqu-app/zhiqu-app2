<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>把学习变化，落到具体记录上</h1>
        <p>从实际作答出发，找到值得再看一次的知识点。</p>
      </div>
      <button class="button secondary" @click="exportRecords">
        <AppIcon name="download" :size="18" />导出学习记录
      </button>
    </header>
    <div class="filter-bar panel">
      <span>知识点练习记录</span>
      <select v-model="range" class="input" aria-label="报告时间范围">
        <option value="all">全部时间</option>
        <option value="7">最近 7 天</option>
        <option value="30">最近 30 天</option>
      </select>
    </div>
    <div v-if="!attempts.length" class="panel empty-state">
      <AppIcon name="chart" :size="44" />
      <h2>先积累一次真实的练习</h2>
      <p>完成答题后，这里会展示你的正确率、用时和知识点记录。</p>
      <router-link to="/app/practice" class="button primary">开始练习</router-link>
    </div>
    <template v-else
      ><div class="content-with-aside">
        <section>
          <div class="panel report-stats">
            <div>
              <AppIcon name="file" /><span>答对 / 作答</span
              ><strong
                ><AnimatedNumber :value="correct" />
                <small>/ <AnimatedNumber :value="attempts.length" /></small
              ></strong>
            </div>
            <div>
              <AnimatedRing :value="rate" />
              <span>本次范围正确率</span>
            </div>
            <div>
              <AppIcon name="clock" /><span>累计练习用时</span
              ><strong
                ><AnimatedNumber :value="minutes" /><small>
                  分 <AnimatedNumber :value="seconds" /> 秒</small
                ></strong
              >
            </div>
          </div>
          <section class="panel report-chart">
            <div class="panel-heading">
              <h2>最近七天的练习节奏</h2>
              <span class="small muted">单位：作答次数</span>
            </div>
            <div
              :key="range"
              class="chart-bars chart-animated"
              role="img"
              aria-label="最近七天每日作答次数柱状图"
            >
              <div
                v-for="(day, index) in days"
                :key="day.key"
                class="chart-column"
                :style="{ '--bar-delay': index * 65 + 'ms' }"
              >
                <strong>{{ day.count || '' }}</strong>
                <div :style="{ height: Math.max(2, (day.count / maxCount) * 150) + 'px' }" />
                <span>{{ day.label }}</span>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-heading"><h2>知识点练习详情</h2></div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>知识点</th>
                    <th>作答次数</th>
                    <th>正确率</th>
                    <th>下一步</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="point in points" :key="point.name">
                    <td>{{ point.name }}</td>
                    <td>{{ point.count }}</td>
                    <td>{{ point.rate }}%</td>
                    <td>
                      <router-link to="/app/mistakes" class="text-button">{{
                        point.rate < 80 ? '继续巩固' : '回顾记录'
                      }}</router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>
        <aside class="right-rail">
          <section class="panel">
            <h2>下一步，学什么</h2>
            <p class="muted">
              {{
                rate < 80
                  ? '回看错题对应的定义，再用例子检验理解。'
                  : '保持节奏，安排一次间隔复习。'
              }}
            </p>
            <router-link to="/app/mistakes" class="button secondary full-width"
              >回看错题</router-link
            ><router-link to="/app/plan" class="button primary full-width"
              >安排复习计划</router-link
            >
          </section>
          <section class="panel tip-card">
            <AppIcon name="info" />
            <h2>记录需要时间</h2>
            <p>这些数据来自本浏览器的实际作答。少量题目不能代表完整的学习能力。</p>
          </section>
        </aside>
      </div></template
    >
  </div>
</template>
<script>
import { state, notify } from '../store'
import { questions } from '../data/demo'
import AnimatedRing from '../components/AnimatedRing.vue'
export default {
  name: 'Reports',
  components: { AnimatedRing },
  data: () => ({ state, range: 'all' }),
  computed: {
    attempts() {
      return state.attempts.filter(
        (a) =>
          this.range === 'all' ||
          Date.now() - new Date(a.date).getTime() < Number(this.range) * 86400000
      )
    },
    correct() {
      return this.attempts.filter((a) => a.correct).length
    },
    rate() {
      return this.attempts.length ? Math.round((this.correct / this.attempts.length) * 100) : 0
    },
    totalSeconds() {
      return this.attempts.reduce((sum, a) => sum + a.seconds, 0)
    },
    minutes() {
      return Math.floor(this.totalSeconds / 60)
    },
    seconds() {
      return this.totalSeconds % 60
    },
    points() {
      return ['特征值', '特征向量'].map((name) => {
        const ids = questions.filter((q) => q.point === name).map((q) => q.id)
        const rows = this.attempts.filter((a) => ids.includes(a.questionId))
        return {
          name,
          count: rows.length,
          rate: rows.length
            ? Math.round((rows.filter((a) => a.correct).length / rows.length) * 100)
            : 0
        }
      })
    },
    days() {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - 6 + i)
        const key = date.toLocaleDateString('sv-SE')
        return {
          key,
          label: date.getMonth() + 1 + '/' + date.getDate(),
          count: this.attempts.filter((a) => new Date(a.date).toLocaleDateString('sv-SE') === key)
            .length
        }
      })
    },
    maxCount() {
      return Math.max(1, ...this.days.map((d) => d.count))
    }
  },
  methods: {
    exportRecords() {
      const blob = new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), attempts: state.attempts, tasks: state.tasks },
            null,
            2
          )
        ],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '知序-学习记录.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify('学习记录已导出为 JSON 文件')
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.report-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  margin-bottom: 20px;
  > div {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 10px;
    border-right: 1px solid #23435c;
    &:last-child {
      border: 0;
    }
    > .app-icon {
      color: #25baf3;
    }
    > span {
      color: #8eb0cc;
      font-size: 12px;
    }
    > strong {
      color: #d9efff;
      font-size: 30px;
      font-weight: 500;
    }
    small {
      font-size: 14px;
      color: #98b6ce;
    }
  }
}
.report-chart {
  margin-bottom: 20px;
}
.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 220px;
  border-bottom: 1px solid #29475c;
  padding: 0 10px 8px;
  background: repeating-linear-gradient(to top, transparent 0, transparent 49px, #173b512e 50px);
  .chart-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 10%;
    gap: 8px;
    > div {
      width: 65%;
      min-width: 12px;
      border-radius: 3px 3px 0 0;
      background: linear-gradient(0deg, #0e85d1, @cyan);
    }
    span {
      font-size: 11px;
      color: #93b6d2;
    }
    strong {
      font-size: 11px;
      font-weight: 500;
    }
  }
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
  th {
    color: #749fbe;
    font-weight: normal;
    background: #081d2e;
  }
  th,
  td {
    padding: 14px 12px;
    border-bottom: 1px solid #173b52;
    white-space: nowrap;
  }
}
@media (max-width: 767px) {
  .report-stats {
    gap: 4px;
    padding: 18px 8px;
    > div {
      > strong {
        font-size: 25px;
      }
      > span {
        font-size: 10px;
      }
    }
  }
  .chart-bars {
    padding: 0;
    .chart-column span {
      font-size: 10px;
    }
  }
}
.reveal-visible .chart-animated .chart-column > div {
  transform-origin: center bottom;
  animation: chart-rise 0.75s cubic-bezier(0.2, 0.75, 0.25, 1) both;
  animation-delay: calc(var(--reveal-delay, 0ms) + var(--bar-delay, 0ms));
}
@keyframes chart-rise {
  from {
    transform: scaleY(0);
    opacity: 0.3;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
