<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>把学习变化，落到具体记录上</h1>
        <p>从实际作答出发，找到值得再看一次的知识点。</p>
      </div>
      <button class="button secondary" @click="exportRecords">
        <AppIcon name="download" :size="18" />
        {{ "导出当前报告" }}
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
    <p v-if="loading && !summary" class="panel" role="status">正在读取学习报告…</p>
    <p v-else-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <div v-else-if="!totalCount" class="panel empty-state">
      <AppIcon name="chart" :size="44" />
      <h2>先积累一次真实的练习</h2>
      <p>完成答题后，这里会展示你的正确率、用时和知识点记录。</p>
      <router-link :to="{ path: '/app/practice', query: pointLocation({}).query }" class="button primary">开始练习</router-link>
    </div>
    <template v-else>
      <div class="content-with-aside">
        <section>
          <div class="panel report-stats">
            <div>
              <AppIcon name="file" /><span>答对 / 作答</span>
              <strong>
                <AnimatedNumber :value="correct" />
                <small>/
                  <AnimatedNumber :value="totalCount" />
                </small>
              </strong>
            </div>
            <div>
              <AnimatedRing :value="rate" />
              <span>本次范围正确率</span>
            </div>
            <div>
              <AppIcon name="clock" /><span>累计练习用时</span><strong>
                <AnimatedNumber :value="minutes" /><small>
                  分
                  <AnimatedNumber :value="seconds" /> 秒
                </small>
              </strong>
            </div>
          </div>
          <section class="panel report-chart" :aria-busy="loading">
            <div class="panel-heading">
              <h2>最近七天的练习节奏</h2>
              <span class="small muted" role="status">{{ loading ? "正在更新…" : "单位：作答次数" }}</span>
            </div>
            <div class="report-plot">
              <PracticeActivityChart :days="days" />
            </div>
          </section>
          <section class="panel">
            <div class="panel-heading">
              <h2>知识点练习详情</h2>
            </div>
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
                  <tr v-for="point in points" :key="JSON.stringify([point.courseId, point.knowledgeNodeId, point.name])">
                    <td>{{ point.name }}</td>
                    <td>{{ point.count }}</td>
                    <td>{{ point.rate }}%</td>
                    <td>
                      <router-link :to="pointLocation(point)" class="text-button">{{
                        point.knowledgeNodeId ? "练习本知识点" : "回顾课程错题" }}</router-link>
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
                rate < 80 ? "回看错题对应的定义，再用例子检验理解。" : "保持节奏，安排一次间隔复习。" }} </p>
                <router-link :to="pointLocation({})" class="button secondary full-width">
                  回看错题
                </router-link>
                <router-link to="/app/plan" class="button primary full-width">
                  安排复习计划
                </router-link>
          </section>
          <section class="panel tip-card">
            <AppIcon name="info" />
            <h2>记录需要时间</h2>
            <p>
              {{"这些数据来自账号中保存的后端作答记录。"}}少量题目不能代表完整的学习能力。
            </p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
<script>
import { state, notify } from "../store";
import AnimatedRing from "../components/AnimatedRing.vue";
import { loadReport } from "../services/questions";
export default {
  name: "Reports",
  components: {
    AnimatedRing,
    PracticeActivityChart: () => import("../components/PracticeActivityChart.vue"),
  },
  data: () => ({
    state,
    range: "all",
    summary: null,
    loading: false,
    loadError: "",
    loadRevision: 0,
  }),
  computed: {
    totalCount() {
      return this.summary?.total || 0;
    },
    correct() {
      return this.summary?.correct || 0;
    },
    rate() {
      return this.summary?.rate || 0;
    },
    totalSeconds() {
      return this.summary?.totalSeconds || 0;
    },
    minutes() {
      return Math.floor(this.totalSeconds / 60);
    },
    seconds() {
      return this.totalSeconds % 60;
    },
    points() {
      return this.summary?.points || [];
    },
    days() {
      return this.summary?.days || [];
    },
  },
  methods: {
    pointLocation(point) {
      const course = point.courseId || this.$route.query.course;
      const query = typeof course === "string" && course ? { course } : {};
      if (query.course && point.knowledgeNodeId) {
        return { path: "/app/practice", query: { ...query, node: point.knowledgeNodeId } };
      }
      return { path: "/app/mistakes", query };
    },
    async load() {
      if (state.mode !== "account") return;
      const revision = ++this.loadRevision;
      this.loading = true;
      this.loadError = "";
      try {
        const result = await loadReport(
          this.range,
          typeof this.$route.query.course === "string"
            ? this.$route.query.course
            : undefined,
        );
        if (revision === this.loadRevision) this.summary = result;
      } catch (error) {
        if (revision === this.loadRevision) this.loadError = error.message;
      } finally {
        if (revision === this.loadRevision) this.loading = false;
      }
    },
    exportRecords() {
      if (
        state.mode === "account" &&
        (!this.summary || this.loading || this.loadError)
      ) {
        notify("请先成功读取报告后再导出。");
        return;
      }
      const blob = new Blob(
        [
          JSON.stringify(
            state.mode === "account"
              ? {
                exportedAt: new Date().toISOString(),
                courseId: this.$route.query.course || null,
                summary: this.summary,
              }
              : {
                exportedAt: new Date().toISOString(),
                attempts: state.attempts,
                tasks: state.tasks,
              },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "知序-学习报告汇总.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("学习记录已导出为 JSON 文件");
    },
  },
  watch: {
    range() {
      this.load();
    },
    "$route.query.course"() {
      this.summary = null;
      this.load();
    },
  },
  created() {
    this.load();
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.report-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  margin-bottom: 20px;

  >div {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 10px;
    border-right: 1px solid #23435c;

    &:last-child {
      border: 0;
    }

    >.app-icon {
      color: #25baf3;
    }

    >span {
      color: #8eb0cc;
      font-size: 12px;
    }

    >strong {
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

.report-plot {
  min-width: 0;
  height: clamp(210px, 30vw, 250px);
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

    >div {
      >strong {
        font-size: 25px;
      }

      >span {
        font-size: 10px;
      }
    }
  }
}
</style>
