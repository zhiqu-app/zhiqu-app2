<template>
  <div class="studio-page">
    <header class="page-heading">
      <div>
        <h1>AI 研习室</h1>
        <p>阅读课程资料、提问并回看之前的答疑记录。</p>
      </div>
      <select
        v-model="courseId"
        class="input course-select"
        aria-label="选择研习课程"
        @change="courseChanged"
      >
        <option
          v-for="course in state.courses"
          :key="course.id"
          :value="course.id"
        >
          {{ course.name }}
        </option>
      </select>
    </header>
    <p v-if="loading" class="muted" role="status">
      正在读取课程资料与问答历史…
    </p>
    <p v-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <div class="mobile-study-tabs tabs">
      <button :class="{ active: tab === 'document' }" @click="tab = 'document'">
        课程资料
      </button>
      <button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">
        阅读答疑
      </button>
    </div>
    <div class="studio-layout">
      <section
        class="panel document-panel"
        :class="{ 'mobile-hidden': tab !== 'document' }"
      >
        <div class="document-toolbar">
          <select
            v-model="materialId"
            aria-label="选择阅读资料"
            @change="readDocument()"
          >
            <option v-for="m in materials" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
            <option v-if="!materials.length" value="">暂无资料</option>
          </select>
          <span class="badge">{{
            remoteCourse ? "账号课程资料" : "本机资料"
          }}</span>
        </div>
        <aside
          v-if="activeSource"
          class="source-preview"
          aria-label="引用原文"
          role="status"
        >
          <div class="source-preview-heading">
            <strong
              ><AppIcon name="file" :size="14" />引用原文 ·
              {{ activeSource.name }}</strong
            >
            <button
              type="button"
              aria-label="关闭引用定位"
              @click="clearSource"
            >
              ×
            </button>
          </div>
          <p>{{ activeSource.excerpt || "该引用未附带原文片段。" }}</p>
          <span>{{ sourceStatus }}</span>
        </aside>
        <div
          v-if="document && document.url"
          class="document-view-tabs"
          aria-label="PDF 阅读方式"
        >
          <button
            type="button"
            :aria-pressed="documentView === 'original'"
            @click="setDocumentView('original')"
          >
            原始 PDF
          </button>
          <button
            type="button"
            :aria-pressed="documentView === 'text'"
            @click="setDocumentView('text')"
          >
            提取文字
          </button>
          <span v-if="sourceRange && sourceRange.page"
            >引用位于第 {{ sourceRange.page }} 页</span
          >
        </div>
        <div v-if="docLoading" class="empty-state" role="status">
          正在读取原始文件…
        </div>
        <div v-else-if="docError" class="empty-state">
          <p class="error-message" role="alert">{{ docError }}</p>
          <button class="button secondary" @click="readDocument(activeSource)">
            重试读取
          </button>
        </div>
        <iframe
          v-else-if="document && document.url && documentView === 'original'"
          :src="document.url"
          title="课程 PDF 预览"
          class="studio-pdf"
        />
        <article v-else-if="document" ref="document" class="document-paper">
          <span class="document-kicker">知序 · 课程资料</span>
          <h2>{{ document.name.replace(/\.(txt|md)$/i, "") }}</h2>
          <p v-if="!paragraphs.length" class="document-no-text">
            这份资料暂无可显示的提取文字，可切换原始 PDF 查看。
          </p>
          <div v-for="p in paragraphs" :key="p.start" class="paper-paragraph">
            <template v-for="(segment, index) in p.segments">
              <mark
                v-if="segment.highlighted"
                :key="index"
                class="source-highlight-text"
                tabindex="-1"
                >{{ segment.text }}</mark
              >
              <span v-else :key="index">{{ segment.text }}</span>
            </template>
          </div>
          <div class="paper-footer">
            {{ document._remote ? "已保存到账号" : "本机资料" }} ·
            请结合原文核对
          </div>
        </article>
        <div v-else class="empty-state">
          <AppIcon name="file" :size="40" />
          <h2>还没有课程资料</h2>
          <p>在已建立的课程中导入 TXT、Markdown 或 PDF。</p>
          <router-link
            :to="courseId ? '/app/courses/' + courseId : '/app/courses'"
            class="button primary"
            >导入资料</router-link
          >
        </div>
      </section>
      <section
        class="panel chat-panel"
        :class="{ 'mobile-hidden': tab !== 'chat' }"
      >
        <div class="panel-heading">
          <h2>课程答疑</h2>
          <span class="badge"
            >{{
              remoteCourse
                ? answerMode === "llm"
                  ? "模型答疑"
                  : answerMode === "retrieval"
                    ? "课程资料检索"
                    : "账号答疑"
                : "本地检索演示"
            }}
          </span>
        </div>
        <p v-if="historyError" class="error-message" role="alert">
          {{ historyError }}
          <button class="text-button" @click="courseChanged">重读历史</button>
        </p>
        <div ref="messages" class="chat-messages" aria-live="polite">
          <div class="chat-intro">
            <AppIcon name="spark" :size="28" />
            <h3>让问题带你走近理解</h3>
            <p>
              {{
                remoteCourse
                  ? "问答与引用保存在账号中，下次进入这门课程可继续查看。"
                  : "当前为本地体验，不保存到服务器。"
              }}
            </p>
            <button
              v-for="text in suggestions"
              :key="text"
              class="suggestion-button"
              :disabled="busy || loading || !canAsk"
              @click="send(text)"
            >
              {{ text }}<AppIcon name="arrow" :size="16" />
            </button>
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <UserAvatar v-if="message.role === 'user'" :size="30" />
            <div v-else class="assistant-avatar">
              <AppIcon name="book" :size="20" />
            </div>
            <div class="message-body">
              <p>{{ message.text }}</p>
              <button
                v-for="(source, i) in message.sources"
                :key="i"
                class="source-chip"
                @click="locate(source)"
              >
                <AppIcon name="file" :size="16" />{{ source.name }} · 原文片段
              </button>
            </div>
          </article>
          <p v-if="busy" class="muted small">正在查阅课程资料…</p>
        </div>
        <div class="chat-compose">
          <p class="small muted">
            <AppIcon name="info" :size="14" />{{
              remoteCourse
                ? "支持可解析的课程文字与 PDF；扫描图片暂无 OCR。"
                : "仅检索本机文字资料。"
            }}
          </p>
          <form @submit.prevent="send(question)">
            <textarea
              v-model="question"
              aria-label="向课程资料提问"
              placeholder="结合课程资料提问…"
              rows="2"
              maxlength="2000"
              @keydown.enter.exact.prevent="send(question)"
            />
            <button
              v-if="busy"
              class="button secondary"
              type="button"
              @click="stop"
            >
              停止
            </button>
            <button
              v-else
              class="send-button"
              :disabled="!question.trim() || !canAsk || loading"
              aria-label="发送问题"
            >
              <AppIcon name="send" />
            </button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
<script>
import UserAvatar from "../components/UserAvatar.vue";
import { state, uid, notify } from "../store";
import { askAssistant } from "../services/assistant";
import { locateSource, sourceParagraphs } from "../utils/sourceLocation";
import { motionAllowed } from "../utils/motion";
import {
  loadCourses,
  getCourse,
  loadMaterials,
  previewMaterial,
} from "../services/courses";
import {
  askAccountAssistant,
  loadAssistantHistory,
} from "../services/platform";
export default {
  name: "Studio",
  components: { UserAvatar },
  data: () => ({
    state,
    courseId: "",
    materialId: "",
    document: null,
    question: "",
    messages: [],
    busy: false,
    tab: "chat",
    activeSource: null,
    documentView: "original",
    loading: false,
    loadError: "",
    docLoading: false,
    docError: "",
    historyError: "",
    answerMode: "",
    generation: 0,
    loadRevision: 0,
    docRevision: 0,
  }),
  computed: {
    course() {
      return state.courses.find((c) => c.id === this.courseId);
    },
    remoteCourse() {
      return state.mode === "account" && this.course?._remote;
    },
    materials() {
      return state.materials.filter((m) => m.courseId === this.courseId);
    },
    searchable() {
      return this.materials.filter((m) => m.text);
    },
    canAsk() {
      return this.remoteCourse
        ? this.materials.some((m) => m._remote && m.parseStatus === "ready")
        : state.mode === "demo" && this.searchable.length > 0;
    },
    paragraphs() {
      return sourceParagraphs(this.document?.text, this.sourceRange);
    },
    sourceRange() {
      return this.document?.id === this.activeSource?.materialId
        ? locateSource(this.document?.text, this.activeSource)
        : null;
    },
    sourceStatus() {
      if (this.docLoading) return "正在读取并定位引用…";
      if (this.docError) return "资料读取失败，引用快照已保留，请重试读取。";
      if (this.sourceRange)
        return this.sourceRange.page
          ? `已在提取文字中定位 · 第 ${this.sourceRange.page} 页`
          : "已定位到原文，高亮部分为引用内容。";
      return "无法匹配当前正文，已保留回答时的引用快照。";
    },
    suggestions() {
      const nodes = state.knowledgeGraphs[this.courseId]?.nodes;
      return nodes?.length
        ? nodes.slice(0, 2).map((n) => "如何理解" + n.label + "？")
        : ["这份资料有哪些核心概念？", "能用一个例子解释吗？"];
    },
  },
  watch: {
    "$route.query.course"(id) {
      if (id && id !== this.courseId) {
        this.courseId = id;
        this.courseChanged();
      }
    },
  },
  created() {
    this.load();
  },
  beforeDestroy() {
    this.stop();
    ++this.loadRevision;
    ++this.docRevision;
  },
  methods: {
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        await loadCourses();
        this.courseId =
          typeof this.$route.query.course === "string"
            ? this.$route.query.course
            : state.courses.find((c) => !c.archived)?.id ||
              state.courses[0]?.id ||
              "";
        await this.courseChanged();
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },
    async courseChanged() {
      this.stop();
      ++this.docRevision;
      this.activeSource = null;
      this.documentView = "original";
      this.docLoading = false;
      this.docError = "";
      const revision = ++this.loadRevision;
      this.loading = true;
      this.loadError = "";
      this.historyError = "";
      this.messages = [];
      this.document = null;
      this.materialId = "";
      this.answerMode = "";
      try {
        const course = this.courseId ? await getCourse(this.courseId) : null;
        if (course && this.remoteCourse) {
          await loadMaterials(course);
          try {
            const history = await loadAssistantHistory(this.courseId);
            if (revision !== this.loadRevision) return;
            this.messages = history.flatMap((row) => [
              {
                id: row.id + "-q",
                role: "user",
                text: row.question,
                sources: [],
              },
              {
                id: row.id,
                role: "assistant",
                text: row.text,
                sources: row.sources,
              },
            ]);
            this.answerMode = history.at(-1)?.mode || "";
          } catch (error) {
            this.historyError = error.message;
          }
        }
        if (revision === this.loadRevision) {
          this.materialId = this.materials[0]?.id || "";
          await this.readDocument();
        }
      } catch (error) {
        if (revision === this.loadRevision) this.loadError = error.message;
      } finally {
        if (revision === this.loadRevision) this.loading = false;
      }
    },
    async readDocument(source = null) {
      // 引用与读取共享版本号，迟到的文件响应不能覆盖后来选择的资料或课程。
      const revision = ++this.docRevision;
      this.activeSource = source ? { ...source } : null;
      this.documentView = source ? "text" : "original";
      this.document = null;
      this.docError = "";
      const item = this.materials.find((m) => m.id === this.materialId);
      if (!item) {
        this.docLoading = false;
        return;
      }
      this.docLoading = true;
      try {
        const result = await previewMaterial(item);
        if (revision === this.docRevision && !this._isDestroyed)
          this.document = { ...result };
      } catch (error) {
        if (revision === this.docRevision) this.docError = error.message;
      } finally {
        if (revision === this.docRevision) this.docLoading = false;
      }
      if (revision === this.docRevision && !this._isDestroyed) {
        await this.$nextTick();
        this.focusSource();
      }
    },
    async send(text) {
      if (!text.trim() || this.busy || this.loading) return;
      if (!this.canAsk) {
        notify("请先导入可解析的课程资料。");
        return;
      }
      const question = text.trim();
      this.question = "";
      this.tab = "chat";
      this.messages.push({
        id: uid(),
        role: "user",
        text: question,
        sources: [],
      });
      this.busy = true;
      const generation = ++this.generation;
      this.controller = new AbortController();
      try {
        const answer = this.remoteCourse
          ? await askAccountAssistant(
              { courseId: this.courseId, question },
              this.controller.signal,
            )
          : await askAssistant({
              question,
              materials: this.searchable,
              signal: this.controller.signal,
            });
        if (generation !== this.generation) return;
        this.answerMode = answer.mode || "";
        this.messages.push({
          id: answer.id || uid(),
          role: "assistant",
          text: answer.text,
          sources: answer.sources || [],
        });
        this.scroll();
      } catch (error) {
        if (error.name !== "AbortError")
          notify(error.message || "答疑失败，请重试。");
      } finally {
        if (generation === this.generation) this.busy = false;
      }
    },
    stop() {
      ++this.generation;
      if (this.controller) this.controller.abort();
      this.busy = false;
    },
    scroll() {
      this.$nextTick(() => {
        if (this.$refs.messages)
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
      });
    },
    async locate(source) {
      // 不依赖 materialId watcher：当前文件里的另一处引用也必须重新定位。
      if (!this.materials.some((m) => m.id === source.materialId)) {
        notify("引用资料已删除。");
        return;
      }
      this.materialId = source.materialId;
      this.tab = "document";
      if (
        this.document?.id === source.materialId &&
        !this.docLoading &&
        !this.docError
      ) {
        this.activeSource = { ...source };
        this.documentView = "text";
        await this.$nextTick();
        this.focusSource();
      } else await this.readDocument(source);
    },
    clearSource() {
      this.activeSource = null;
    },
    async setDocumentView(view) {
      this.documentView = view;
      await this.$nextTick();
      if (view === "text") this.focusSource();
    },
    focusSource() {
      if (
        this._isDestroyed ||
        this._isBeingDestroyed ||
        this.documentView !== "text"
      )
        return;
      const mark = this.$refs.document?.querySelector(".source-highlight-text");
      if (!mark) return;
      mark.scrollIntoView({
        block: "center",
        behavior: motionAllowed() ? "smooth" : "auto",
      });
      mark.focus({ preventScroll: true });
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.studio-layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  height: calc(100dvh - 245px);
  min-height: 540px;
}

.studio-page .course-select {
  width: 210px;
}

.document-panel {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
}

.source-preview {
  margin: 10px 12px 0px;
  padding: 10px 12px;
  border: 1px solid #326780;
  border-radius: 7px;
  background: #0c3045;
  flex: none;
  p {
    margin: 6px 0;
    max-height: 70px;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
    line-height: 1.7;
    color: #c4e3f0;
  }
  > span {
    font-size: 10px;
    color: #82bed5;
  }
}
.source-preview-heading {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  strong {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #a6def2;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  button {
    margin-left: auto;
    padding: 0 3px;
    line-height: 1;
    font-size: 20px;
    color: #9ac8dc;
  }
}
.document-view-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px;
  flex: none;
  button {
    padding: 6px 10px;
    border: 1px solid #28516b;
    border-radius: 5px;
    font-size: 11px;
    color: #86b1c8;
    &[aria-pressed="true"] {
      color: #b1edff;
      border-color: #4fa8c5;
      background: #143b50;
    }
  }
  span {
    font-size: 10px;
    color: #83a9bd;
  }
}

.mobile-study-tabs {
  display: none;
}

.document-panel {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.document-toolbar {
  flex: none;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid @border;

  select {
    flex: 1;
    min-width: 0;
    max-width: 100%;
    background: #0b2338;
    border: 1px solid #21455c;
    border-radius: 5px;
    padding: 8px;
    font-size: 13px;
  }
}

.document-paper {
  margin: 12px;
  padding: 36px 32px;
  background: #f9fcff;
  color: #152536;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  font-family: "SimSun", "Songti SC", serif;
  border-radius: 3px;
  font-size: 17px;
  transition: box-shadow 0.2s;

  h2 {
    font-size: 26px;
    padding-bottom: 20px;
    border-bottom: 1px solid #b4c7d4;
    margin-bottom: 28px;
  }

  .document-kicker {
    font-family: "Microsoft YaHei", sans-serif;
    font-size: 10px;
    color: #698395;
    display: block;
    margin-bottom: 12px;
  }

  .paper-paragraph {
    margin: 0 0 23px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 2;

    &.definition {
      padding: 12px 16px;
      border-radius: 6px;
      background: #dcf4fd;
      color: #0e4b80;
    }
  }

  .paper-footer {
    border-top: 1px solid #cfdae2;
    padding-top: 18px;
    margin-top: 30px;
    font-size: 11px;
    font-family: "Microsoft YaHei", sans-serif;
    color: #617b8e;
  }

  .source-highlight-text {
    color: #123a50;
    background: #b4edf5;
    box-shadow: 0 2px 0 #32a7ba;
    border-radius: 2px;
    padding: 2px 0;
    outline: none;
    scroll-margin-block: 40px;
  }
}

.studio-pdf {
  width: 100%;
  height: 100%;
  flex: 1;
  border: 0;
  min-height: 0;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  min-height: 0;

  > .panel-heading {
    padding: 17px 20px;
    margin: 0;
    border-bottom: 1px solid @border;
  }
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 17px;
  scroll-behavior: smooth;
}

.chat-intro {
  margin: 6px 0 30px;

  > .app-icon {
    color: #3dd6ff;
    margin-bottom: 12px;
  }

  h3 {
    font-size: 19px;
    margin: 0 0 10px;
  }

  p {
    font-size: 12px;
    color: #8bafcd;
  }
}

.suggestion-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  border: 1px solid #214860;
  background: #0b2941;
  border-radius: 6px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 8px;
  font-size: 13px;
  text-align: left;
  color: #b1d9f3;

  &:hover {
    border-color: @cyan;
  }
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 18px 0;

  .message-body {
    padding: 14px;
    background: #0d2c46;
    border: 1px solid #234b69;
    border-radius: 10px;
    flex: 1;
    min-width: 0;
  }

  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14px;
    margin: 0;
    line-height: 1.9;
  }

  &.user {
    flex-direction: row-reverse;
    margin-left: 28px;

    .message-body {
      background: #12519e;
      border-color: #1762bf;
    }
  }
}

.assistant-avatar {
  width: 32px;
  height: 32px;
  border: 1px solid #00bafa;
  color: #00c4ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.chat-compose {
  padding: 13px 16px 16px;
  border-top: 1px solid @border;

  > p {
    font-size: 10px;
    margin-bottom: 10px;
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }

  form {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  textarea {
    background: #061c2d;
    border: 1px solid #295678;
    padding: 10px 12px;
    border-radius: 7px;
    resize: none;
    flex: 1;
    min-height: 52px;
    max-height: 140px;
    font-size: 13px;
  }
}

.send-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: @blue;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 900px) and (min-width: 768px) {
  .studio-layout {
    grid-template-columns: 1fr 1fr;
  }

  .studio-layout .document-paper {
    padding: 24px 18px;
    font-size: 15px;
  }
}

@media (max-width: 767px) {
  .document-toolbar {
    padding: 12px;
    gap: 8px;

    select {
      font-size: 12px;
    }

    .badge {
      font-size: 9px;
    }
  }

  .mobile-study-tabs {
    display: flex;
    margin-bottom: 12px;

    button {
      flex: 1;
    }
  }

  .studio-layout {
    display: block;
    height: auto;
    min-height: 0;

    .mobile-hidden {
      display: none;
    }

    > .panel {
      height: calc(100dvh - 340px);
      min-height: 420px;
    }
  }

  .studio-page .course-select {
    width: 100%;
    min-height: 40px;
  }

  .studio-page .page-heading {
    gap: 12px;
  }

  .document-paper {
    margin: 8px;
    padding: 26px 20px;
    font-size: 16px;

    h2 {
      font-size: 22px;
    }
  }

  .chat-compose {
    padding: 12px;

    textarea {
      font-size: 16px;
    }
  }

  .chat-panel {
    padding: 18px 15px;
  }
}
</style>
