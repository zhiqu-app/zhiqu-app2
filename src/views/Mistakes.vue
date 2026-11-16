<template>
  <div class="mistakes-page">
    <header class="page-heading">
      <div>
        <h1>让错题成为下一次进步的起点</h1>
        <p>把没想清楚的地方，变成下一步的学习方向。</p>
      </div>
      <router-link v-if="!loading && !loadError && !mistakes.length" :to="practiceLocation" class="button primary">
        <AppIcon name="edit" :size="18" />开始练习
      </router-link>
    </header>
    <p v-if="loading" class="panel" role="status">正在读取错题记录…</p>
    <p v-else-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <div v-if="!loading && !loadError && mistakes.length" class="filter-bar panel">
      <div class="tabs">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          全部错题
        </button>
        <button :class="{ active: filter === 'pending' }" @click="filter = 'pending'">
          待巩固
        </button>
        <button :class="{ active: filter === 'reviewed' }" @click="filter = 'reviewed'">
          已复习
        </button>
      </div>
      <span class="muted small">按题目归并 · 以最后一次作答判断掌握情况</span>
    </div>
    <p v-if="!loading && !loadError && !filtered.length" class="panel mistakes-empty" role="status">
      {{ mistakes.length ? "当前筛选下暂无错题" : "暂无错题记录" }}
    </p>
    <div v-else-if="!loading && !loadError" class="mistakes-layout">
      <section class="panel mistake-list">
        <button v-for="q in filtered" :key="q.id" class="mistake-item" :class="{ active: selectedId === q.id }"
          @click="selectedId = q.id">
          <span class="badge" :class="{ amber: !q.reviewed }">{{
            q.reviewed ? "已复习" : "待巩固"
          }}</span>
          <h3>{{ q.title }}</h3>
          <span class="muted small">{{ q.point }} · 错误 {{ q.wrongCount }} 次</span>
        </button>
      </section>
      <section v-if="selected" class="panel mistake-detail">
        <span class="badge amber">{{ selected.point }}</span>
        <h2>{{ selected.title }}</h2>
        <div class="answer-options">
          <div v-for="(option, i) in selected.options" :key="i" class="answer-option" :class="{
            correct: i === selected.answer,
            wrong: i === selected.lastWrong.choice,
          }">
            <span class="option-letter">{{ "ABCDEF"[i] }}</span>
            {{ option }}
            <AppIcon v-if="i === selected.answer" name="check" :size="16" />
          </div>
        </div>
        <h3>解析</h3>
        <p>{{ selected.explanation }}</p>
        <p v-if="selected.sourceEvidence && selected.sourceEvidence.excerpt" class="evidence-excerpt">{{ selected.sourceEvidence.excerpt }}</p>
        <router-link :to="sourceLocation" class="source-chip">
          <AppIcon name="file" :size="16" />{{ selected.sourceEvidence?.materialId ? "查看原文 · " + selected.sourceEvidence.name : sourceLocation.query.material ? "查看来源资料" : "回看本课程资料" }}
        </router-link>
        <div class="button-row">
          <button class="button secondary" :disabled="!!pendingPlan" @click="addPlan(selected)">
            <AppIcon name="calendar" :size="18" />加入复习计划
          </button>
          <button class="button primary" @click="retry(selected)">
            再练一次
            <AppIcon name="arrow" :size="18" />
          </button>
        </div>
        <div v-if="selected.knowledgeNodeId" class="retest-actions">
          <button class="button secondary" :disabled="!!pendingPlan" @click="addPlan(selected, true)">
            <AppIcon name="calendar" :size="18" />安排同知识点复测
          </button>
          <p class="small muted">选用同一知识点的另一道题，两天后提醒。</p>
        </div>
      </section>
    </div>
  </div>
</template>
<script>
import { state, notify } from "../store";
import { loadMistakes, planMistake, retestMistake } from "../services/questions";
import { studioSourceLocation } from "../utils/sourceLocation";
export default {
  name: "Mistakes",
  data: () => ({
    filter: "all",
    selectedId: "",
    remoteMistakes: [],
    loading: false,
    loadError: "",
    loadRevision: 0,
    pendingPlan: false,
  }),
  computed: {
    courseId() {
      return typeof this.$route.query.course === "string" ? this.$route.query.course : undefined;
    },
    nodeId() {
      return typeof this.$route.query.node === "string" ? this.$route.query.node : undefined;
    },
    practiceLocation() {
      return {
        path: "/app/practice",
        query: {
          ...(this.courseId ? { course: this.courseId } : {}),
          ...(this.nodeId ? { node: this.nodeId } : {}),
        },
      };
    },
    mistakes() {
      return this.remoteMistakes;
    },
    filtered() {
      return this.mistakes.filter(
        (q) =>
          this.filter === "all" || q.reviewed === (this.filter === "reviewed"),
      );
    },
    selected() {
      return (
        this.filtered.find((q) => q.id === this.selectedId) || this.filtered[0]
      );
    },
    sourceLocation() {
      return studioSourceLocation(this.selected?.courseId, this.selected?.sourceEvidence, this.selected?.source);
    },
  },
  methods: {
    async load() {
      if (state.mode !== "account") return;
      const revision = ++this.loadRevision;
      this.loading = true;
      this.loadError = "";
      this.selectedId = "";
      try {
        const items = await loadMistakes(this.courseId, "all", this.nodeId);
        if (revision === this.loadRevision && !this._isDestroyed)
          this.remoteMistakes = items;
      } catch (error) {
        if (revision === this.loadRevision && error.name !== "AbortError")
          this.loadError = error.message;
      } finally {
        if (revision === this.loadRevision) this.loading = false;
      }
    },
    async addPlan(q, retest = false) {
      if (this.pendingPlan) return;
      if (state.mode !== "account") {
        notify("请登录账号后安排复习。");
        return;
      }
      this.pendingPlan = true;
      try {
        const result = await (retest ? retestMistake(q.id) : planMistake(q.id));
        if (retest) notify(result.created ? "已安排同知识点复测，两天后提醒。" : "这道错题已有待完成的复测计划。");
        else notify(result.created ? "已加入复习计划" : "这道题已在复习计划中");
      } catch (error) {
        if (error.name !== "AbortError") notify(error.message);
      } finally {
        this.pendingPlan = false;
      }
    },
    retry(q) {
      if (state.mode === "account") {
        const key =
          "zhixu-practice-draft:account:" + state.account.id + ":" + q.courseId;
        let draft = {};
        try {
          draft = JSON.parse(sessionStorage.getItem(key)) || {};
        } catch (_) { }
        if (draft.answers) delete draft.answers[q.id];
        if (draft.pendingSubmission?.questionId === q.id)
          draft.pendingSubmission = null;
        sessionStorage.setItem(key, JSON.stringify(draft));
        this.$router.push({
          path: "/app/practice",
          query: { course: q.courseId, question: q.id },
        });
        return;
      }
    },
  },
  created() {
    this.load();
  },
  watch: {
    "$route.fullPath"() {
      this.load();
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.mistakes-page {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.mistakes-empty {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 120px;
  margin: 0;
  color: @muted;
  text-align: center;
}

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

.evidence-excerpt {
  padding-left: 12px;
  border-left: 2px solid @border;
  overflow-wrap: anywhere;
}

.retest-actions {
  margin-top: 18px;

  p {
    margin: 8px 0 0;
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
