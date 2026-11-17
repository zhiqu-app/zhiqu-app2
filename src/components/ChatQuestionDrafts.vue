<template>
  <section class="chat-drafts" aria-label="可加入题库的练习题">
    <template v-if="drafts.length">
      <header class="draft-header">
        <strong>练习题 · {{ drafts.length }} 道单选</strong>
        <button v-if="remaining.length > 1" type="button" class="draft-button" :disabled="busy"
          @click="addQuestions(remaining)">
          全部加入题库
        </button>
      </header>
      <ol class="draft-list">
        <li v-for="(draft, index) in drafts" :key="index" class="draft-card">
          <h4>{{ index + 1 }}. {{ draft.title }}</h4>
          <ul>
            <li v-for="(option, i) in draft.options" :key="i">{{ letters[i] }}. {{ option }}</li>
          </ul>
          <details>
            <summary>答案与解析</summary>
            <div>{{ letters[draft.answer] }}. {{ draft.options[draft.answer] }}</div>
            <div>{{ draft.explanation }}</div>
          </details>
          <footer>
            <span>{{ draft.point }}</span>
            <button type="button" class="draft-button" :disabled="busy || !!processed[index]"
              @click="addQuestions([index])">
              {{ processed[index] || "加入题库" }}
            </button>
          </footer>
        </li>
      </ol>
    </template>
    <button v-else-if="canPrepare" class="draft-button" type="button" :disabled="busy" @click="prepare">
      {{ busy ? "正在整理…" : "整理成题库题目" }}
    </button>
    <div v-if="result" class="draft-feedback" role="status">
      {{ resultText }}
      <router-link :to="{ name: 'question-bank', params: { id: courseId } }">查看本课程题库</router-link>
    </div>
    <div v-if="error" class="draft-error" role="alert">{{ error }}</div>
  </section>
</template>

<script>
import { prepareChatQuestions } from "../services/platform";
import { importQuestions } from "../services/questions";

export default {
  name: "ChatQuestionDrafts",
  props: {
    turnId: { type: String, required: true },
    courseId: { type: String, required: true },
    questions: { type: Array, default: () => [] },
    canPrepare: Boolean,
  },
  data() {
    return {
      drafts: this.questions,
      letters: ["A", "B", "C", "D", "E", "F"],
      processed: {},
      busy: false,
      result: null,
      error: "",
    };
  },
  computed: {
    remaining() {
      return this.drafts.map((_, index) => index).filter((index) => !this.processed[index]);
    },
    resultText() {
      const { imported, skipped } = this.result;
      if (!imported) return "题目已存在。";
      return "已加入 " + imported + " 道题" + (skipped ? "，跳过 " + skipped + " 道重复题。" : "。");
    },
  },
  beforeDestroy() {
    this.prepareRequest?.abort();
  },
  methods: {
    async prepare() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      this.prepareRequest = new AbortController();
      try {
        const result = await prepareChatQuestions(this.turnId, this.prepareRequest.signal);
        if (!result.questions?.length) throw new Error("暂时没有可整理的单选题。");
        this.drafts = result.questions;
      } catch (error) {
        if (error.name !== "AbortError") this.error = error.message;
      } finally {
        this.prepareRequest = null;
        this.busy = false;
      }
    },
    async addQuestions(indices) {
      if (this.busy || !indices.length) return;
      this.busy = true;
      this.error = "";
      this.result = null;
      try {
        this.result = await importQuestions(this.courseId, {
          questions: indices.map((index) => this.drafts[index]),
          deduplicateSimilar: true,
        });
        const status = this.result.skipped === 0 ? "已加入" : this.result.imported === 0 ? "已存在" : "已处理";
        for (const index of indices) this.$set(this.processed, index, status);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.chat-drafts {
  display: grid;
  gap: 8px;
  margin: 10px 0;
  color: #cce4f3;
}

.draft-header,
.draft-card footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.draft-list,
.draft-card ul {
  display: grid;
  gap: 7px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.draft-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #29556e;
  border-radius: 8px;
  background: #082236;
  overflow-wrap: anywhere;
  font-size: 13px;

  h4 {
    margin: 0;
    color: #f1f8ff;
  }

  ul {
    padding-left: 5px;
    gap: 3px;
  }

  details {
    color: #accde0;
  }

  summary {
    color: #85dff3;
    cursor: pointer;
  }

  footer span {
    color: #9ab8cc;
    font-size: 12px;
  }
}

.draft-button {
  justify-self: start;
  padding: 5px 9px;
  border: 1px solid #3a839d;
  border-radius: 6px;
  background: #103449;
  color: #b8efff;
  font-size: 12px;

  &:hover:not(:disabled), &:focus-visible {
    border-color: #79daef;
    color: #fff;
  }
}

.draft-feedback {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;

  a {
    color: #80e0f5;
    text-decoration: underline;
  }
}

.draft-error {
  color: #ffb2ad;
  font-size: 12px;
}
</style>
