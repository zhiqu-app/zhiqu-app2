<template>
  <div>
    <header class="page-heading">
      <div>
        <router-link
          :to="'/app/courses/' + $route.params.id"
          class="text-button"
          >返回课程</router-link
        >
        <h1>配置课程题库</h1>
        <p>
          {{ course ? course.name : "正在读取课程" }} · 导入自己的单选题和解析
        </p>
      </div>
      <router-link
        v-if="course"
        :to="{ path: '/app/practice', query: { course: course.id } }"
        class="button primary"
        >开始练习</router-link
      >
    </header>
    <label v-if="course" class="bank-course-label"
      >题库所属课程<select
        v-model="selectedCourseId"
        class="input"
        aria-label="题库所属课程"
        :disabled="busy"
        @change="changeCourse"
      >
        <option
          v-for="item in state.courses.filter((c) => c._remote)"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </select></label
    >
    <section v-if="loading" class="panel bank-status" role="status">
      正在读取课程题库…
    </section>
    <section v-else-if="loadError" class="panel bank-status">
      <p class="error-message" role="alert">{{ loadError }}</p>
      <button class="button secondary" @click="load">重新加载</button>
    </section>
    <section
      v-else-if="!course || !course._remote || state.mode !== 'account'"
      class="panel bank-status"
    >
      <h2>先把课程保存到账号</h2>
      <p>题库会保存在对应课程下，本机课程请先在课程详情同步。</p>
      <router-link
        :to="
          state.mode === 'account'
            ? '/app/courses/' + $route.params.id
            : '/login'
        "
        class="button primary"
        >{{
          state.mode === "account" ? "返回课程同步" : "登录账号"
        }}</router-link
      >
    </section>
    <div v-else class="content-with-aside">
      <section>
        <article class="panel bank-import">
          <h2>从 JSON 导入题库</h2>
          <p class="muted">
            每次 1～200 题，文件不超过 100 KB。导入只追加，完整重复题目会跳过。
          </p>
          <div class="button-row">
            <label class="button primary bank-upload"
              >选择 JSON 文件<input
                type="file"
                accept=".json,application/json"
                :disabled="busy"
                @change="readFile" /></label
            ><button
              class="button secondary"
              :disabled="busy"
              @click="downloadTemplate"
            >
              下载 JSON 模板
            </button>
          </div>
          <button class="text-button" :disabled="busy" @click="previewExample">
            预览前端示例（不保存）
          </button>
          <p v-if="filename" class="muted">已选择：{{ filename }}</p>
          <p v-if="fileError" class="error-message" role="alert">
            {{ fileError }}
          </p>
          <section v-if="payload" class="bank-preview">
            <h3>预览 {{ payload.questions.length }} 道题</h3>
            <p class="muted small">仅显示前 10 题；点击确认后才写入后端。</p>
            <ol>
              <li v-for="(q, i) in payload.questions.slice(0, 10)" :key="i">
                <strong>{{ q.title }}</strong>
                <span
                  >{{ q.point }} · {{ q.options.length }} 个选项 · 正确选项
                  {{ letters[q.answer] }}</span
                >
                <ul class="bank-options">
                  <li v-for="(option, j) in q.options" :key="j">
                    <b>{{ letters[j] }}.</b><span>{{ option }}</span>
                  </li>
                </ul>
              </li>
            </ol>
            <button
              class="button primary"
              :disabled="busy || exampleOnly"
              @click="confirmImport"
            >
              {{ busy ? "正在导入…" : "确认导入题库" }}
            </button>
          </section>
          <p v-if="exampleOnly" class="muted small">
            这里只预览前端示例，不会加入课程题库；正式导入请另选 JSON 文件。
          </p>
          <p v-if="importError" class="error-message" role="alert">
            {{ importError }}
          </p>
          <p v-if="result" class="bank-result" role="status">
            导入完成：新增 {{ result.imported }} 题，跳过重复
            {{ result.skipped }} 题，当前共 {{ result.total }} 题。
          </p>
        </article>
        <article class="panel bank-list">
          <div class="panel-heading">
            <h2>
              已有题目 <span class="muted">{{ questions.length }}</span>
            </h2>
            <button class="text-button" @click="refresh">刷新题库</button>
            <button
              class="button secondary small-button"
              @click="singleOpen = true"
            >
              手动新增题目
            </button>
          </div>
          <p v-if="!questions.length" class="muted">
            这门课程还没有题目，先下载模板填写后导入。
          </p>
          <ol>
            <li v-for="q in questions" :key="q.id">
              <strong>{{ q.title }}</strong
              ><span>{{ q.point }} · {{ q.options.length }} 个选项</span>
              <ul class="bank-options">
                <li v-for="(option, j) in q.options" :key="j">
                  <b>{{ letters[j] }}.</b><span>{{ option }}</span>
                </li>
              </ul>
            </li>
          </ol>
        </article>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <h2>填写规则</h2>
          <p>JSON 顶层使用 questions 数组，也支持直接传入题目数组。</p>
          <p>
            每题包含 title、options、answer、explanation、point。answer 从 0
            开始，例如第一项填 0。
          </p>
          <p>source 可省略；关联资料时必须使用本课程的真实资料 ID。</p>
          <p class="muted small">
            任何一道题校验不通过，整批不会写入。已有作答与错题记录会保留。
          </p>
        </section>
      </aside>
    </div>
    <AppModal v-if="singleOpen" title="手动新增课程题目" @close="closeSingle"
      ><form @submit.prevent="saveSingle">
        <p class="muted small single-form-tip">
          按提示填写一道单选题；输入框中的示例不会自动保存。
        </p>
        <label class="field-label" for="single-title">题干</label>
        <textarea
          id="single-title"
          v-model="single.title"
          class="input"
          required
          maxlength="500"
          rows="2"
          placeholder="例如：TCP 提供哪一种传输服务？"
          :disabled="busy"
        />
        <label class="field-label" for="single-options">选项（每行一个，2～6 项）</label>
        <textarea
          id="single-options"
          v-model="single.options"
          class="input"
          required
          rows="5"
          :placeholder="'可靠的字节流传输\n不可靠的数据报传输'"
          aria-describedby="single-options-help"
          :disabled="busy"
        />
        <p id="single-options-help" class="muted small single-field-help">
          每行填写一个选项，无需输入 A、B 或序号。
        </p>
        <div
          v-if="singleOptions.length"
          class="single-options-preview"
          aria-live="polite">
          <p
            class="small"
            :class="{ 'error-message': singleOptions.length > 6 }">
            已识别 {{ singleOptions.length }} 个选项，保存时将自动编号：
          </p>
          <div v-for="(option, i) in singleOptions.slice(0, 6)" :key="i">
            <b>{{ letters[i] }}.</b><span>{{ option }}</span>
          </div>
        </div>
        <label class="field-label" for="single-answer">正确选项</label>
        <select
          id="single-answer"
          v-model.number="single.answer"
          class="input"
          required
          :disabled="
            busy || singleOptions.length < 2 || singleOptions.length > 6
          "
          aria-describedby="single-answer-help"
        >
          <option value="" disabled>
            {{
              singleOptions.length < 2 ? "先填写至少两个选项" : "请选择正确选项"
            }}
          </option>
          <option v-for="(option, i) in singleOptions" :key="i" :value="i">
            {{ letters[i] }}. {{ option }}
          </option>
        </select>
        <p id="single-answer-help" class="muted small single-field-help">
          填写选项后，从这里选择正确答案，例如 A. 可靠的字节流传输。
        </p>
        <label class="field-label" for="single-point">知识点</label>
        <input
          id="single-point"
          v-model="single.point"
          class="input"
          required
          maxlength="80"
          placeholder="例如：TCP 可靠传输"
          :disabled="busy"
        />
        <label class="field-label" for="single-explanation">答案解析</label>
        <textarea
          id="single-explanation"
          v-model="single.explanation"
          class="input"
          required
          maxlength="5000"
          rows="3"
          placeholder="例如：TCP 通过序号、确认和重传等机制，提供可靠的字节流传输服务。"
          :disabled="busy"
        />
        <p v-if="singleError" class="error-message" role="alert">
          {{ singleError }}
        </p>
        <div class="modal-actions">
          <button
            class="button secondary"
            type="button"
            :disabled="busy"
            @click="closeSingle"
          >
            取消
          </button>
          <button
            class="button primary"
            :disabled="
              busy ||
              singleOptions.length < 2 ||
              singleOptions.length > 6 ||
              single.answer === ''
            "
          >
            保存题目
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
<script>
import { state, notify } from "../store";
import { getCourse } from "../services/courses";
import { loadQuestions, importQuestions } from "../services/questions";
import AppModal from "../components/AppModal.vue";
import { createSingleQuestion } from "../services/platform";
import {
  parseQuestionImport,
  questionTemplate,
  QUESTION_IMPORT_MAX_BYTES,
} from "../utils/questionImport";
export default {
  name: "QuestionBank",
  components: { AppModal },
  data: () => ({
    state,
    course: null,
    questions: [],
    loading: true,
    loadError: "",
    busy: false,
    filename: "",
    payload: null,
    fileError: "",
    importError: "",
    result: null,
    fileRevision: 0,
    letters: "ABCDEF",
    exampleOnly: false,
    selectedCourseId: "",
    singleOpen: false,
    singleError: "",
    single: { title: "", options: "", answer: "", point: "", explanation: "" },
  }),
  computed: {
    singleOptions() {
      return this.single.options
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    },
  },
  watch: {
    singleOptions(options) {
      if (this.single.answer !== "" && this.single.answer >= options.length)
        this.single.answer = "";
    },
  },
  created() {
    this.load();
  },
  methods: {
    closeSingle() {
      if (!this.busy) this.singleOpen = false;
    },
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        this.course = await getCourse(this.$route.params.id);
        this.selectedCourseId = this.course?.id || "";
        if (this.course?._remote && state.mode === "account")
          await this.refresh();
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },
    async refresh() {
      try {
        this.questions = await loadQuestions(this.course.id);
      } catch (error) {
        this.loadError = error.message;
      }
    },
    async readFile(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || this.busy) return;
      const revision = ++this.fileRevision;
      this.payload = null;
      this.exampleOnly = false;
      this.fileError = "";
      this.importError = "";
      this.result = null;
      this.filename = file.name;
      try {
        if (file.size > QUESTION_IMPORT_MAX_BYTES)
          throw new Error("JSON 文件不能超过 100 KB，请拆分后导入。");
        const text = await file.text();
        if (revision === this.fileRevision)
          this.payload = parseQuestionImport(text);
      } catch (error) {
        if (revision === this.fileRevision) this.fileError = error.message;
      }
    },
    async confirmImport() {
      if (!this.payload || this.busy || this.exampleOnly) return;
      this.busy = true;
      this.importError = "";
      this.result = null;
      try {
        this.result = await importQuestions(this.course.id, this.payload);
        await this.refresh();
        notify("题库已保存到课程");
      } catch (error) {
        const detail = error.details?.[0];
        this.importError = detail
          ? detail.field + "：" + detail.message
          : error.message;
      } finally {
        this.busy = false;
      }
    },
    downloadTemplate() {
      const blob = new Blob([JSON.stringify(questionTemplate, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "课程题库模板.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    previewExample() {
      this.payload = JSON.parse(JSON.stringify(questionTemplate));
      this.exampleOnly = true;
      this.fileError = "";
      this.importError = "";
      this.filename = "前端示例";
      this.result = null;
    },
    changeCourse() {
      this.$router.push("/app/courses/" + this.selectedCourseId + "/questions");
    },
    async saveSingle() {
      if (this.busy) return;
      this.singleError = "";
      try {
        if (this.single.answer === "") throw new Error("请先选择正确选项。");
        const body = {
          title: this.single.title,
          options: this.singleOptions,
          answer: this.single.answer,
          point: this.single.point,
          explanation: this.single.explanation,
        };
        parseQuestionImport(JSON.stringify({ questions: [body] }));
        this.busy = true;
        await createSingleQuestion(this.course.id, body);
        this.singleOpen = false;
        this.single = {
          title: "",
          options: "",
          answer: "",
          point: "",
          explanation: "",
        };
        await this.refresh();
        notify("题目已保存");
      } catch (error) {
        this.singleError = error.details?.[0]?.message || error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

/* 手工题目填写引导：提示与真实输入分开，选项预览沿用题库的字母编号。 */
.single-form-tip {
  line-height: 1.8;
  margin: 14px 0 18px;
}
.single-field-help {
  line-height: 1.8;
  margin: 7px 0 0;
}
.single-options-preview {
  margin: 12px 0 18px;
  padding: 12px;
  background: @surface-raised;
  border: 1px solid @border;
  border-radius: 6px;
  p {
    margin: 0 0 8px;
    color: @muted;
  }
  div {
    display: flex;
    gap: 10px;
    padding: 6px 0;
    font-size: 13px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  b {
    color: @cyan;
    flex-shrink: 0;
  }
}
#single-title,
#single-options,
#single-point,
#single-explanation {
  &::placeholder {
    color: @muted;
    opacity: 0.75;
  }
}
.bank-course-label {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  color: @muted;
  select {
    width: auto;
    max-width: 70%;
    background: @bg;
    color: @text;
  }
}
.bank-preview .bank-options,
.bank-list .bank-options {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  li {
    padding: 8px 12px;
    border: 0;
    display: flex;
    gap: 10px;
    background: @surface-raised;
    margin-bottom: 5px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.8;
  }
  b {
    color: @cyan;
    flex-shrink: 0;
  }
  span {
    display: inline;
    font-size: 13px;
    color: @text;
    margin: 0;
  }
}
/* 课程题库配置：导入确认与已存题目均限定在当前课程。 */
.bank-status,
.bank-import,
.bank-list {
  padding: 26px;
}
.bank-import {
  margin-bottom: 20px;
}
.bank-upload {
  position: relative;
  cursor: pointer;
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
}
.bank-preview {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid @border;
}
.bank-preview ol,
.bank-list ol {
  padding-left: 22px;
  li {
    padding: 14px 0;
    border-bottom: 1px solid @border;
    overflow-wrap: anywhere;
  }
  strong {
    display: block;
    font-size: 14px;
    line-height: 1.8;
  }
  span {
    display: block;
    margin-top: 8px;
    color: @muted;
    font-size: 12px;
  }
}
.bank-result {
  padding: 16px;
  border: 1px solid @cyan;
  border-radius: 6px;
  color: @cyan;
  margin-top: 20px;
}
.bank-preview .button {
  margin-top: 20px;
}
.right-rail p {
  line-height: 1.9;
  font-size: 13px;
  overflow-wrap: anywhere;
}
@media (max-width: 480px) {
  .bank-status,
  .bank-import,
  .bank-list {
    padding: 18px;
  }
}
</style>
