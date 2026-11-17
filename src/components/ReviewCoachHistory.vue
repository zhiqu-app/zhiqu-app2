<template>
  <section class="panel coach-history" aria-labelledby="coach-history-title" :aria-busy="loading">
    <header>
      <h2 id="coach-history-title">建议历史</h2>
    </header>
    <p v-if="loading && !entries.length" class="muted" role="status">正在读取历史建议…</p>
    <p v-else-if="!entries.length && !error" class="muted">生成复习建议后，就可以在这里回看。</p>
    <ol v-if="entries.length" class="history-list">
      <li v-for="entry in entries" :key="entry.id">
        <details class="history-entry">
          <summary>
            <span class="history-topic">
              <strong>{{ entry.focus?.label || "复习建议" }}</strong>
              <span>{{ entry.courseName }}</span>
            </span>
            <span class="history-meta">
              <time :datetime="entry.createdAt">{{ formatDate(entry.createdAt) }}</time>
              <span>{{ entry.minutes }} 分钟</span>
            </span>
            <AppIcon name="chevron" :size="16" class="history-chevron" />
          </summary>
          <div class="history-detail">
            <p v-if="entry.goal"><strong>复习目标</strong> {{ entry.goal }}</p>
            <p v-if="entry.focus">当时近 14 天内做过 {{ entry.focus.total }} 道相关题，其中 {{ entry.focus.wrong }} 道最近一次仍答错。</p>
            <p v-if="statusMessages[entry.status]">{{ statusMessages[entry.status] }}</p>
            <section v-if="entry.evidence.length" class="history-sources">
              <h3>推荐讲义</h3>
              <blockquote v-for="source in entry.evidence" :key="source.materialId + ':' + source.start">
                <p>{{ source.excerpt }}</p>
                <router-link :to="sourceLocation(entry.courseId, source)" target="_blank" rel="opener"
                  class="text-button">
                  {{ source.name }}{{ source.page ? " · 第 " + source.page + " 页" : "" }} · 查看原文
                </router-link>
              </blockquote>
            </section>
            <section v-if="entry.questions.length">
              <h3>当时推荐的练习</h3>
              <ul class="history-questions">
                <li v-for="question in entry.questions" :key="question.id">{{ question.title }}</li>
              </ul>
            </section>
            <p class="history-basis">
              <strong>{{ entry.mode === "ai" ? "AI 工具调用" : "按作答记录分析" }}</strong>
              <span v-if="entry.checks.length">{{ entry.checks.join("、") }}</span>
            </p>
          </div>
        </details>
      </li>
    </ol>
    <p v-if="error" class="error-message" role="alert">{{ error }}</p>
    <button v-if="error || offset < total" class="button secondary history-more" type="button" :disabled="loading" @click="loadPage">
      {{ loading ? "正在读取…" : error ? "重试读取" : "加载更多" }}
    </button>
  </section>
</template>

<script>
import { COACH_STATUS_MESSAGES, loadCoachHistory } from "../services/review-coach";
import { studioSourceLocation } from "../utils/sourceLocation";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });

export default {
  name: "ReviewCoachHistory",
  data: () => ({
    entries: [], offset: 0, total: 0, loading: false, error: "",
    statusMessages: COACH_STATUS_MESSAGES,
  }),
  created() {
    this.loadPage();
  },
  beforeDestroy() {
    this.historyRequest?.abort();
  },
  methods: {
    formatDate(value) {
      return dateFormatter.format(new Date(value));
    },
    sourceLocation: studioSourceLocation,
    async loadPage() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      this.historyRequest = new AbortController();
      try {
        const page = await loadCoachHistory(this.offset, this.historyRequest.signal);
        const existing = new Set(this.entries.map((entry) => entry.id));
        this.entries.push(...page.items.filter((entry) => !existing.has(entry.id)));
        this.offset += page.items.length;
        this.total = page.items.length ? page.total : this.offset;
      } catch (error) {
        if (error.name !== "AbortError") this.error = error.message;
      } finally {
        this.historyRequest = null;
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.coach-history {
  max-width: 880px;
  padding: 22px;
}

h2, h3, p { margin: 0; }
h2 { font-size: 20px; }
h3 { font-size: 15px; }
.coach-history > p { margin-top: 14px; }
.history-list { padding: 0; margin: 14px 0 0; list-style: none; }
.history-entry { border-top: 1px solid @border; }
.history-list > li:last-child { border-bottom: 1px solid @border; }

.history-entry summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 10px;
  padding: 13px 4px;
  list-style: none;
  cursor: pointer;
  overflow-wrap: anywhere;

  &::-webkit-details-marker { display: none; }
  &:hover { background: @surface-raised; }
  &:focus-visible { outline: 2px solid @cyan; outline-offset: -2px; }
}

.history-meta, .history-topic {
  display: grid;
  gap: 3px;
  color: @muted;
  font-size: 12px;
}

.history-topic strong { color: @text; font-size: 15px; }
.history-meta { text-align: right; }
.history-chevron { color: @cyan; }
.history-entry[open] .history-chevron { transform: rotate(90deg); }
.history-detail {
  display: grid;
  gap: 13px;
  padding: 3px 14px 18px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.history-detail p, .history-basis span { color: @muted; }
.history-detail strong { color: @text; margin-right: 7px; }
.history-sources blockquote {
  border-left: 2px solid @border;
  margin: 7px 0 0;
  padding: 3px 10px;
}
.history-questions { padding-left: 20px; margin: 5px 0 0; }
.history-basis { font-size: 12px; }
.history-more { margin-top: 14px; }

@media (max-width: 540px) {
  .coach-history { padding: 16px; }
  .history-detail { padding-inline: 5px; }
}
</style>
