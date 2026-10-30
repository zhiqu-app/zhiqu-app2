<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>作答历史</h1>
        <p>查看保存在账号中的每次作答，重练会新增记录。</p>
      </div>
      <router-link to="/app/practice" class="button primary">继续练习</router-link>
    </header>
    <label class="history-course">筛选课程
      <select v-model="courseId" class="input" aria-label="筛选作答课程" @change="
        offset = 0;
      load();
      ">
        <option value="">全部课程</option>
        <option v-for="course in state.courses.filter((c) => c._remote)" :key="course.id" :value="course.id">
          {{ course.name }}
        </option>
      </select>
    </label>
    <section v-if="state.mode !== 'account'" class="panel empty-state">
      <h2>登录后查看账号作答记录</h2>
      <router-link to="/login" class="button primary">登录</router-link>
    </section>
    <section v-else class="panel history-panel">
      <p v-if="loading" role="status">正在读取作答记录…</p>
      <p v-else-if="error" class="error-message" role="alert">
        {{ error }} <button class="text-button" @click="load">重试</button>
      </p>
      <template v-else>
        <p v-if="!rows.length" class="muted">还没有作答记录。</p>
        <article v-for="row in rows" :key="row.id" class="history-row">
          <div>
            <span class="badge" :class="{ amber: !row.correct }">{{ row.correct ? "答对" : "答错" }}</span>
            <h2>{{ row.title || "练习题" }}</h2>
            <p>
              {{ courseName(row.courseId) }} · {{ row.point || "课程练习" }} ·
              选择 {{ letters[row.choice] }} · {{ row.seconds }} 秒
            </p>
            <time>{{ date(row.date) }}</time>
          </div>
          <router-link :to="{
            path: '/app/practice',
            query: { course: row.courseId, question: row.questionId },
          }" class="button secondary small-button">查看与重练</router-link>
        </article>
        <div class="history-pages">
          <button class="button secondary" :disabled="!offset" @click="offset -= 20;load();">
            上一页
          </button>
          <span>{{ total }} 条记录</span>
          <button class="button secondary" :disabled="offset + rows.length >= total" @click="offset += 20;load();">
            下一页
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
<script>
import { state } from "../store";
import { loadCourses } from "../services/courses";
import { loadAttemptPage } from "../services/platform";
export default {
  name: "AttemptHistory",
  data: () => ({
    state,
    courseId: "",
    offset: 0,
    total: 0,
    rows: [],
    loading: false,
    error: "",
    revision: 0,
    letters: "ABCDEF",
  }),
  async created() {
    try {
      await loadCourses();
      this.courseId =
        typeof this.$route.query.course === "string"
          ? this.$route.query.course
          : "";
      await this.load();
    } catch (error) {
      this.error = error.message;
    }
  },
  methods: {
    async load() {
      if (state.mode !== "account") return;
      const revision = ++this.revision;
      this.loading = true;
      this.error = "";
      try {
        const page = await loadAttemptPage(this.courseId, this.offset);
        if (revision === this.revision) {
          this.rows = page.items;
          this.total = page.total;
        }
      } catch (error) {
        if (revision === this.revision) this.error = error.message;
      } finally {
        if (revision === this.revision) this.loading = false;
      }
    },
    courseName(id) {
      return state.courses.find((c) => c.id === id)?.name || "课程";
    },
    date(value) {
      return new Date(value).toLocaleString("zh-CN");
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

.history-course {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  color: @muted;

  select {
    width: auto;
    max-width: 75%;
    background: @bg;
    color: @text;
  }
}

.history-panel {
  padding: 24px;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid @border;

  h2 {
    font-size: 17px;
    line-height: 1.8;
    margin: 10px 0;
  }

  p,
  time {
    font-size: 12px;
    color: @muted;
    line-height: 1.8;
  }

  .button {
    flex-shrink: 0;
  }
}

.history-pages {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;

  span {
    font-size: 12px;
    color: @muted;
  }
}

@media (max-width: 480px) {
  .history-panel {
    padding: 16px;
  }

  .history-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
