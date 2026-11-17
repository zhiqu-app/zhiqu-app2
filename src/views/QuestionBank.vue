<template>
  <div>
    <header class="page-heading">
      <div>
        <router-link :to="'/app/courses/' + $route.params.id" class="text-button">返回课程</router-link>
        <h1>配置课程题库</h1>
        <p>
          {{ course ? course.name : "正在读取课程" }} · 导入自己的单选题和解析
        </p>
      </div>
      <router-link v-if="course" :to="{ path: '/app/practice', query: { course: course.id } }"
        class="button primary">开始练习</router-link>
    </header>
    <label v-if="course" class="bank-course-label">题库所属课程<select v-model="selectedCourseId" class="input"
        aria-label="题库所属课程" :disabled="busy" @change="changeCourse">
        <option v-for="item in state.courses.filter((c) => c._remote)" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </select></label>
    <section v-if="loading" class="panel bank-status" role="status">
      正在读取课程题库…
    </section>
    <section v-else-if="loadError" class="panel bank-status">
      <p class="error-message" role="alert">{{ loadError }}</p>
      <button class="button secondary" @click="load">重新加载</button>
    </section>
    <section v-else-if="!course || !course._remote || state.mode !== 'account'" class="panel bank-status">
      <h2>先把课程保存到账号</h2>
      <p>题库保存在后端对应课程下，请返回课程列表重新读取课程。</p>
      <router-link :to="state.mode === 'account'
        ? '/app/courses/' + $route.params.id
        : '/login'
        " class="button primary">{{ "返回课程同步" }}</router-link>
    </section>
    <div v-else class="content-with-aside">
      <section>
        <article class="panel bank-drafts">
          <h2>AI 练习草稿</h2>
          <router-link v-if="$route.query.coach === '1'" :to="{ name: 'review-coach', query: { course: course.id } }"
            class="text-button">返回复习教练</router-link>
          <p class="muted">选择一个知识点，AI 将根据课程资料生成单选题。</p>
          <p v-if="graphLoading" class="muted" role="status">正在读取课程星图…</p>
          <div v-else-if="graphError" class="draft-status">
            <p class="error-message" role="alert">{{ graphError }}</p>
            <button class="text-button" type="button" @click="loadGraph">重新读取星图</button>
          </div>
          <div v-else-if="!graphNodes.length" class="draft-status">
            <p class="muted">课程星图还没有知识点。</p>
            <router-link :to="{ name: 'course-knowledge-edit', params: { id: course.id } }"
              class="text-button">添加知识点</router-link>
          </div>
          <form v-else @submit.prevent="generateDrafts">
            <div class="draft-fields">
              <div>
                <label class="field-label" for="draft-node">出题知识点</label>
                <select id="draft-node" v-model="draftNodeId" class="input" required :disabled="busy || draftGenerating">
                  <option value="" disabled>请选择知识点</option>
                  <option v-for="node in graphNodes" :key="node.id" :value="node.id">{{ node.optionLabel }}</option>
                </select>
              </div>
              <div>
                <label class="field-label" for="draft-material">参考资料</label>
                <select id="draft-material" v-model="draftMaterialId" class="input"
                  :disabled="busy || draftGenerating || materialsLoading || !draftMaterials.length">
                  <option value="">{{ materialsLoading ? "正在读取资料…" : "自动查找相关资料" }}</option>
                  <option v-for="material in draftMaterials" :key="material.id" :value="material.id">
                    {{ material.name }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="materialsError" class="draft-status">
              <p class="muted small" role="status">资料列表读取失败，仍可自动查找相关资料。</p>
              <button class="text-button" type="button" @click="loadDraftMaterials">重新读取资料</button>
            </div>
            <div v-else-if="!materialsLoading && !draftMaterials.length" class="draft-status">
              <p class="muted small">上传可提取文字的课程资料后即可出题。</p>
              <router-link :to="{ name: 'course', params: { id: course.id } }" class="text-button">上传资料</router-link>
            </div>
            <button class="button primary draft-generate" :disabled="!canGenerateDrafts">
              {{ draftGenerating ? "正在生成…" : "生成草稿" }}
            </button>
            <p v-if="draftGenerating" class="muted small" role="status">正在查找课程资料并生成题目。</p>
          </form>
          <p v-if="draftError" class="error-message" role="alert">{{ draftError }}</p>
          <transition name="draft-panel" :css="allowMotion">
          <section v-if="drafts.length || draftResult" ref="draftReview" class="paste-preview draft-review" tabindex="-1"
            aria-label="审核练习草稿">
            <h3 v-if="drafts.length">审核 {{ drafts.length }} 道草稿</h3>
            <p v-if="drafts.length" class="muted small">核对答案和资料原文，勾选要入库的题目。</p>
            <p v-if="draftResult" class="bank-result" role="status">
              已入库 {{ draftResult.imported }} 题，跳过重复 {{ draftResult.skipped }} 题，当前共 {{ draftResult.total }} 题。
            </p>
            <transition-group name="draft-item" tag="ol" class="draft-list" :class="{ animated: allowMotion }" :css="allowMotion">
              <li v-for="q in drafts" :key="q.title" class="draft-card" :class="{ 'draft-selected': approvedDrafts.includes(q.title) }">
                <label class="draft-approval">
                  <input v-model="approvedDrafts" type="checkbox" :value="q.title" :disabled="busy || draftGenerating" />
                  <strong>{{ q.title }}</strong>
                </label>
                <p class="muted small">知识点 {{ q.point }} · 正确选项 {{ letters[q.answer] }}</p>
                <ul class="bank-options">
                  <li v-for="(option, j) in q.options" :key="j" :class="{ 'is-correct': j === q.answer }">
                    <b>{{ letters[j] }}.</b><span>{{ option }}</span>
                  </li>
                </ul>
                <p class="paste-explanation">解析：{{ q.explanation }}</p>
                <figure v-if="q.sourceEvidence" class="draft-evidence">
                  <figcaption>
                    <span>{{ q.sourceEvidence.name }}</span>
                    <router-link v-if="q.sourceEvidence.materialId" :to="draftSource(q.sourceEvidence)"
                      class="text-button" target="_blank" rel="opener" aria-label="查看原文（在新标签页打开）">查看原文</router-link>
                  </figcaption>
                  <blockquote>{{ q.sourceEvidence.excerpt }}</blockquote>
                </figure>
              </li>
            </transition-group>
            <button v-if="drafts.length" class="button primary" type="button" :disabled="busy || draftGenerating || !approvedDrafts.length"
              @click="importDrafts">确认入库<span v-if="approvedDrafts.length">（{{ approvedDrafts.length }} 题）</span></button>
          </section>
          </transition>
        </article>
        <article class="panel bank-import">
          <h2>从 JSON 导入题库</h2>
          <p class="muted">
            每次 1～200 题，文件不超过 100 KB。同一课程内题干和选项相同的题目会跳过，选项顺序不影响判断。
          </p>
          <div class="button-row">
            <label class="button primary bank-upload">选择 JSON 文件
              <input type="file" accept=".json,application/json" :disabled="busy" @change="readFile" />
            </label>
            <button class="button secondary" :disabled="busy" @click="downloadTemplate">
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
                <span>{{ q.point }} · {{ q.options.length }} 个选项 · 正确选项 {{ letters[q.answer] }}</span>
                <ul class="bank-options">
                  <li v-for="(option, j) in q.options" :key="j">
                    <b>{{ letters[j] }}.</b><span>{{ option }}</span>
                  </li>
                </ul>
              </li>
            </ol>
            <button class="button primary" :disabled="busy || exampleOnly" @click="confirmImport">
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
            导入完成：新增 {{ result.imported }} 题，跳过重复 {{ result.skipped }} 题，当前共 {{ result.total }} 题。
          </p>
        </article>
        <article class="panel bank-list">
          <div class="panel-heading">
            <h2>
              已有题目 <span class="muted">{{ questions.length }}</span>
            </h2>
            <button class="text-button" :disabled="busy" @click="refresh">刷新题库</button>
            <button class="button secondary small-button" :disabled="busy" @click="singleOpen = true">
              手动新增题目
            </button>
          </div>
          <p v-if="!questions.length" class="muted">这门课程还没有题目。</p>
          <ol>
            <li v-for="q in questions" :key="q.id">
              <div class="bank-question-heading">
                <strong>{{ q.title }}</strong>
                <div class="bank-question-actions">
                  <button v-if="graphNodes.length && !graphNodeById.has(q.knowledgeNodeId)" type="button"
                    class="text-button" :disabled="busy" @click="openNodeLink(q)">关联知识点</button>
                  <button type="button" class="text-button bank-delete-button" :disabled="busy"
                    @click="openQuestionDelete(q)">删除<span class="sr-only">题目：{{ q.title }}</span></button>
                </div>
              </div>
              <span>{{ q.point }} · {{ q.options.length }} 个选项</span>
              <span v-if="graphNodeById.has(q.knowledgeNodeId)">已关联 {{ graphNodeById.get(q.knowledgeNodeId).optionLabel }}</span>
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
    <AppModal v-if="singleOpen" title="手动新增课程题目" @close="closeSingle">
      <div class="question-entry-modes" role="group" aria-label="新增题目方式">
        <button type="button" :aria-pressed="singleMode === 'form'" :disabled="busy" @click="singleMode = 'form'">
          逐项填写
        </button>
        <button type="button" :aria-pressed="singleMode === 'json'" :disabled="busy" @click="singleMode = 'json'">
          粘贴 JSON
        </button>
      </div>
      <form v-if="singleMode === 'form'" @submit.prevent="saveSingle">
        <p class="muted small single-form-tip">
          按提示填写一道单选题；输入框中的示例不会自动保存。
        </p>
        <label class="field-label" for="single-title">题干</label>
        <textarea id="single-title" v-model="single.title" class="input" required maxlength="500" rows="2"
          placeholder="例如：TCP 提供哪一种传输服务？" :disabled="busy" />
        <label class="field-label" for="single-options">选项（每行一个，2～6 项）</label>
        <textarea id="single-options" v-model="single.options" class="input" required rows="5"
          :placeholder="'可靠的字节流传输\n不可靠的数据报传输'" aria-describedby="single-options-help" :disabled="busy" />
        <p id="single-options-help" class="muted small single-field-help">
          每行填写一个选项，无需输入 A、B 或序号。
        </p>
        <div v-if="singleOptions.length" class="single-options-preview" aria-live="polite">
          <p class="small" :class="{ 'error-message': singleOptions.length > 6 }">
            已识别 {{ singleOptions.length }} 个选项，保存时将自动编号：
          </p>
          <div v-for="(option, i) in singleOptions.slice(0, 6)" :key="i">
            <b>{{ letters[i] }}.</b>
            <span>{{ option }}</span>
          </div>
        </div>
        <label class="field-label" for="single-answer">正确选项</label>
        <select id="single-answer" v-model.number="single.answer" class="input" required :disabled="busy || singleOptions.length < 2 || singleOptions.length > 6
          " aria-describedby="single-answer-help">
          <option value="" disabled>
            {{
              singleOptions.length < 2 ? "先填写至少两个选项" : "请选择正确选项" }} </option>
          <option v-for="(option, i) in singleOptions" :key="i" :value="i">
            {{ letters[i] }}. {{ option }}
          </option>
        </select>
        <p id="single-answer-help" class="muted small single-field-help">
          填写选项后，从这里选择正确答案，例如 A. 可靠的字节流传输。
        </p>
        <label class="field-label" for="single-node">关联星图知识点（可选）</label>
        <select id="single-node" v-model="single.knowledgeNodeId" class="input" :disabled="busy || !graphNodes.length">
          <option value="">不关联星图</option>
          <option v-for="node in graphNodes" :key="node.id" :value="node.id">{{ node.optionLabel }}</option>
        </select>
        <p v-if="!graphNodes.length" class="muted small single-field-help">
          {{ graphLoading ? "正在读取课程星图…" : "仍可手动填写知识点名称。" }}
        </p>
        <label class="field-label" for="single-point">知识点名称</label>
        <input id="single-point" v-model="single.point" class="input" :required="!singleNode" maxlength="80"
          :placeholder="singleNode ? singleNode.label : '例如：TCP 可靠传输'" :disabled="busy" />
        <p v-if="singleNode" class="muted small single-field-help">留空时使用星图中的名称。</p>
        <label class="field-label" for="single-explanation">答案解析</label>
        <textarea id="single-explanation" v-model="single.explanation" class="input" required maxlength="5000" rows="3"
          placeholder="例如：TCP 通过序号、确认和重传等机制，提供可靠的字节流传输服务。" :disabled="busy" />
        <p v-if="singleError" class="error-message" role="alert">
          {{ singleError }}
        </p>
        <div class="modal-actions">
          <button class="button secondary" type="button" :disabled="busy" @click="closeSingle">
            取消
          </button>
          <button class="button primary" :disabled="busy ||
            singleOptions.length < 2 ||
            singleOptions.length > 6 ||
            single.answer === ''
            ">
            保存题目
          </button>
        </div>
      </form>
      <section v-else class="paste-entry">
        <p class="muted small single-form-tip">
          粘贴 AI 生成或自己编写的题目 JSON。支持单题对象、题目数组或 questions
          数组，每次 1～200 题、最多 100 KB。
        </p>
        <label class="field-label" for="question-json">题目 JSON</label>
        <textarea id="question-json" v-model="jsonText" class="input paste-input" rows="10" :placeholder="jsonExample"
          :disabled="busy" aria-describedby="question-json-help" spellcheck="false" />
        <p id="question-json-help" class="muted small single-field-help">
          每题包含 title、options、answer、explanation、point。answer 从 0
          开始：0=A、1=B；也可粘贴完整的 JSON 代码块。
        </p>
        <div class="paste-tools">
          <button type="button" class="text-button" :disabled="busy || !!jsonText.trim()" @click="fillJsonExample">
            填入示例
          </button>
          <button type="button" class="button secondary" :disabled="busy || !jsonText.trim()" @click="previewJson">
            校验并预览
          </button>
        </div>
        <p v-if="jsonError" class="error-message" role="alert">
          {{ jsonError }}
        </p>
        <section v-if="jsonPayload" ref="jsonPreview" class="paste-preview" tabindex="-1" aria-label="题目预览">
          <h3>待保存 {{ jsonPayload.questions.length }} 道题</h3>
          <p class="muted small">
            保存到「{{ course.name }}」。仅展示前 10 题，确认后才写入题库。
          </p>
          <ol>
            <li v-for="(q, i) in jsonPayload.questions.slice(0, 10)" :key="i">
              <strong>{{ q.title }}</strong>
              <p class="muted small">
                知识点：{{ q.point }} · 正确答案：{{ letters[q.answer] }}
              </p>
              <ul class="bank-options">
                <li v-for="(option, j) in q.options" :key="j" :class="{ 'is-correct': j === q.answer }">
                  <b>{{ letters[j] }}.</b><span>{{ option }}</span>
                </li>
              </ul>
              <p class="paste-explanation">解析：{{ q.explanation }}</p>
            </li>
          </ol>
        </section>
        <p v-if="jsonResult" class="bank-result paste-result" role="status">
          保存完成：新增 {{ jsonResult.imported }} 题，跳过重复
          {{ jsonResult.skipped }} 题，当前共 {{ jsonResult.total }} 题。
        </p>
        <div class="modal-actions">
          <button type="button" class="button secondary" :disabled="busy" @click="closeSingle">
            {{ jsonResult ? "完成" : "取消" }}
          </button>
          <button type="button" class="button primary" :disabled="busy || !jsonPayload" @click="saveJson">
            {{
              busy
                ? "正在保存…"
                : "确认保存 " +
                (jsonPayload ? jsonPayload.questions.length : 0) +
                " 道题"
            }}
          </button>
        </div>
      </section>
    </AppModal>
    <AppModal v-if="linkingQuestion" title="关联星图知识点" @close="closeNodeLink">
      <form @submit.prevent="saveNodeLink">
        <p class="muted link-question-title">{{ linkingQuestion.title }}</p>
        <label class="field-label" for="link-question-node">选择星图知识点</label>
        <select id="link-question-node" v-model="linkNodeId" class="input" required :disabled="busy">
          <option value="" disabled>请选择知识点</option>
          <option v-for="node in graphNodes" :key="node.id" :value="node.id">{{ node.optionLabel }}</option>
        </select>
        <p v-if="linkError" class="error-message" role="alert">{{ linkError }}</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" :disabled="busy" @click="closeNodeLink">取消</button>
          <button class="button primary" :disabled="busy || !linkNodeId">{{ busy ? "正在保存…" : "保存关联" }}</button>
        </div>
      </form>
    </AppModal>
    <AppModal v-if="questionToDelete" title="删除题目" @close="closeQuestionDelete">
      <form @submit.prevent="confirmQuestionDelete">
        <p class="question-delete-title">{{ questionToDelete.title }}</p>
        <p class="muted">确认后，该题将从课程题库移除，已有作答、错题和复习计划会保留。</p>
        <p v-if="deleteError" class="error-message" role="alert">{{ deleteError }}</p>
        <div class="modal-actions">
          <button type="button" class="button secondary" :disabled="busy" @click="closeQuestionDelete">取消</button>
          <button class="button danger" :disabled="busy">{{ busy ? "正在删除…" : "确认删除" }}</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
<script>
import { state, notify } from "../store";
import { getCourse, loadMaterials } from "../services/courses";
import { loadCourseGraph } from "../services/course-knowledge";
import { loadQuestions, importQuestions, deleteQuestion } from "../services/questions";
import { associateQuestionNode, generatePracticeDrafts } from "../services/question-authoring";
import { takeCoachDraft } from "../services/review-coach";
import { motionAllowed } from "../utils/motion";
import AppModal from "../components/AppModal.vue";
import { createSingleQuestion } from "../services/platform";
import {
  parseQuestionImport,
  parseQuestionPaste,
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
    questionsRevision: 0,
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
    singleMode: "form",
    jsonText: "",
    jsonPayload: null,
    jsonError: "",
    jsonResult: null,
    single: { title: "", options: "", answer: "", point: "", explanation: "", knowledgeNodeId: "" },
    graph: null,
    graphLoading: false,
    graphError: "",
    linkingQuestion: null,
    questionToDelete: null,
    deleteError: "",
    linkNodeId: "",
    linkError: "",
    draftMaterials: [],
    materialsLoading: false,
    materialsError: "",
    draftNodeId: "",
    draftMaterialId: "",
    draftGenerating: false,
    draftError: "",
    draftResult: null,
    drafts: [],
    approvedDrafts: [],
  }),
  computed: {
    allowMotion() {
      return motionAllowed();
    },
    jsonExample() {
      return JSON.stringify(questionTemplate, null, 2);
    },
    singleOptions() {
      return this.single.options
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    },
    graphNodes() {
      if (!this.graph) return [];
      const groups = new Map(this.graph.groups.map((group) => [group.id, group.title]));
      return this.graph.nodes.map((node) => {
        const group = groups.get(node.groupId);
        return { ...node, optionLabel: group ? `${group} / ${node.label}` : node.label };
      });
    },
    graphNodeById() {
      return new Map(this.graphNodes.map((node) => [node.id, node]));
    },
    routeNode() {
      return this.graphNodeById.get(this.$route.query.node);
    },
    singleNode() {
      return this.graphNodeById.get(this.single.knowledgeNodeId);
    },
    canGenerateDrafts() {
      return !!this.draftNodeId && !this.busy && !this.draftGenerating && !this.materialsLoading &&
        (this.draftMaterials.length > 0 || !!this.materialsError);
    },
  },
  watch: {
    "$route.query.node": "selectRouteNode",
    jsonText() {
      // 编辑后必须重新校验，不能将旧预览与新输入混在一起保存。
      this.jsonPayload = null;
      this.jsonError = "";
      this.jsonResult = null;
    },
    singleOptions(options) {
      if (this.single.answer !== "" && this.single.answer >= options.length)
        this.single.answer = "";
    },
  },
  created() {
    this.load();
  },
  beforeDestroy() {
    this.draftRequest?.abort();
  },
  methods: {
    openQuestionDelete(question) {
      this.deleteError = "";
      this.questionToDelete = question;
    },
    closeQuestionDelete() {
      if (!this.busy) this.questionToDelete = null;
    },
    async confirmQuestionDelete() {
      if (this.busy || !this.questionToDelete) return;
      const { id } = this.questionToDelete;
      this.busy = true;
      this.deleteError = "";
      try {
        await deleteQuestion(this.course.id, id);
        this.questionsRevision += 1;
        this.questions = this.questions.filter((question) => question.id !== id);
        this.questionToDelete = null;
        notify("题目已从题库移除");
      } catch (error) {
        this.deleteError = error.message;
      } finally {
        this.busy = false;
      }
    },
    fillJsonExample() {
      if (this.jsonText.trim() || this.busy) return;
      this.jsonText = this.jsonExample;
    },
    async previewJson() {
      if (this.busy) return;
      this.jsonPayload = null;
      this.jsonError = "";
      this.jsonResult = null;
      try {
        this.jsonPayload = parseQuestionPaste(this.jsonText);
        await this.$nextTick();
        if (this.singleOpen && !this._isDestroyed) {
          this.$refs.jsonPreview?.scrollIntoView({
            block: "start",
            behavior: "auto",
          });
          this.$refs.jsonPreview?.focus({ preventScroll: true });
        }
      } catch (error) {
        this.jsonError = error.message;
      }
    },
    async saveJson() {
      if (!this.jsonPayload || this.busy) return;
      this.busy = true;
      this.jsonError = "";
      try {
        // 保存前再次校验原输入，服务器继续校验字段、课程归属并处理重复题。
        const body = parseQuestionPaste(this.jsonText);
        this.jsonResult = await importQuestions(this.course.id, body);
        this.jsonPayload = null;
        await this.refresh();
        notify(this.jsonResult.imported ? "题目已保存到当前课程，可进入练习" : "题目已存在，本次没有新增");
      } catch (error) {
        const detail = error.details?.[0];
        this.jsonError = detail
          ? detail.field + "：" + detail.message
          : error.message;
      } finally {
        this.busy = false;
      }
    },
    closeSingle() {
      if (!this.busy) this.singleOpen = false;
    },
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        this.course = await getCourse(this.$route.params.id);
        this.selectedCourseId = this.course?.id || "";
        if (this.course?._remote && state.mode === "account") {
          await Promise.all([this.loadGraph(), this.loadDraftMaterials(), this.refresh()]);
          if (this.$route.query.coach === "1") {
            const draft = takeCoachDraft(this.course.id, this.$route.query.node);
            if (draft && this.routeNode && this.canGenerateDrafts) this.generateDrafts(draft.count);
          }
        }
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },
    async loadGraph() {
      if (this.graphLoading) return;
      this.graphLoading = true;
      this.graphError = "";
      try {
        this.graph = await loadCourseGraph(this.course.id);
        this.selectRouteNode();
      } catch (error) {
        this.graphError = error.message;
      } finally {
        this.graphLoading = false;
      }
    },
    selectRouteNode() {
      if (!this.routeNode) return;
      this.draftNodeId = this.routeNode.id;
      this.single.knowledgeNodeId = this.routeNode.id;
    },
    openNodeLink(question) {
      this.linkingQuestion = question;
      this.linkNodeId = this.routeNode?.id || "";
      this.linkError = "";
    },
    closeNodeLink() {
      if (!this.busy) this.linkingQuestion = null;
    },
    async saveNodeLink() {
      if (this.busy || !this.linkingQuestion || !this.graphNodeById.has(this.linkNodeId)) return;
      this.busy = true;
      this.linkError = "";
      try {
        const updated = await associateQuestionNode(this.course.id, this.linkingQuestion.id, this.linkNodeId);
        this.questionsRevision += 1;
        this.questions = this.questions.map((q) => q.id === updated.id ? updated : q);
        this.linkingQuestion = null;
        notify("已关联星图知识点");
      } catch (error) {
        this.linkError = error.details?.[0]?.message || error.message;
      } finally {
        this.busy = false;
      }
    },
    async loadDraftMaterials() {
      if (this.materialsLoading) return;
      this.materialsLoading = true;
      this.materialsError = "";
      try {
        const materials = await loadMaterials(this.course);
        this.draftMaterials = materials.filter((item) => item._remote && item.parseStatus === "ready");
        if (!this.draftMaterials.some((item) => item.id === this.draftMaterialId))
          this.draftMaterialId = "";
      } catch (error) {
        this.materialsError = error.message;
      } finally {
        this.materialsLoading = false;
      }
    },
    async generateDrafts(count) {
      if (!this.canGenerateDrafts) return;
      this.draftGenerating = true;
      this.draftError = "";
      this.draftResult = null;
      this.draftRequest = new AbortController();
      try {
        const { questions } = await generatePracticeDrafts({
          courseId: this.course.id,
          knowledgeNodeId: this.draftNodeId,
          ...(Number.isInteger(count) ? { count } : {}),
          ...(this.draftMaterialId ? { materialId: this.draftMaterialId } : {}),
        }, this.draftRequest.signal);
        if (!questions.length) throw new Error("没有生成可用草稿，请换一份资料后重试。");
        this.approvedDrafts = [];
        this.drafts = questions;
        await this.$nextTick();
        this.$refs.draftReview?.focus();
      } catch (error) {
        if (error.name !== "AbortError") this.draftError = error.message;
      } finally {
        this.draftGenerating = false;
        this.draftRequest = null;
      }
    },
    async importDrafts() {
      if (this.busy || this.draftGenerating || !this.approvedDrafts.length) return;
      const approved = new Set(this.approvedDrafts);
      const questions = this.drafts.filter((question) => approved.has(question.title));
      this.busy = true;
      this.draftError = "";
      this.draftResult = null;
      try {
        this.draftResult = await importQuestions(this.course.id, { questions, deduplicateSimilar: true });
        this.drafts = this.drafts.filter((question) => !approved.has(question.title));
        this.approvedDrafts = [];
        await this.refresh();
        notify(this.draftResult.imported ? "已审核的草稿已入库" : "题目已存在，本次没有新增");
      } catch (error) {
        const detail = error.details?.[0];
        this.draftError = detail ? detail.field + "：" + detail.message : error.message;
      } finally {
        this.busy = false;
      }
    },
    draftSource(source) {
      const query = { course: this.course.id, material: source.materialId };
      if (Number.isInteger(source.start) && Number.isInteger(source.end) && source.start >= 0 && source.end > source.start) {
        query.start = String(source.start);
        query.end = String(source.end);
      }
      if (Number.isInteger(source.page) && source.page > 0) query.page = String(source.page);
      return { name: "studio", query };
    },
    async refresh() {
      const revision = ++this.questionsRevision;
      try {
        const questions = await loadQuestions(this.course.id);
        if (revision === this.questionsRevision) this.questions = questions;
      } catch (error) {
        if (revision === this.questionsRevision) this.loadError = error.message;
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
        notify(this.result.imported ? "题库已保存到课程" : "题目已存在，本次没有新增");
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
          point: this.single.point.trim() || this.singleNode?.label || "",
          explanation: this.single.explanation,
        };
        parseQuestionImport(JSON.stringify({ questions: [body] }));
        if (this.singleNode) body.knowledgeNodeId = this.singleNode.id;
        this.busy = true;
        await createSingleQuestion(this.course.id, body);
        this.singleOpen = false;
        this.single = {
          title: "",
          options: "",
          answer: "",
          point: "",
          explanation: "",
          knowledgeNodeId: this.routeNode?.id || "",
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

/* 录入方式与草稿独立；JSON 预览沿用题库选项样式，避免代码长行撑宽手机弹窗。 */
.question-entry-modes {
  display: flex;
  gap: 6px;
  padding: 5px;
  margin-top: 20px;
  background: @bg;
  border: 1px solid @border;
  border-radius: 7px;

  button {
    flex: 1;
    padding: 10px 12px;
    border-radius: 4px;
    color: @muted;
    font-size: 13px;

    &[aria-pressed="true"] {
      color: @cyan;
      background: @surface-raised;
      box-shadow: inset 0 0 0 1px @border;
    }
  }
}

.paste-entry {
  min-width: 0;
}

.paste-input {
  font-family: Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  min-height: 190px;
  resize: vertical;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.paste-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 15px 0;
}

.paste-preview {
  border-top: 1px solid @border;
  padding-top: 15px;
  margin-top: 18px;

  >ol {
    padding-left: 22px;

    >li {
      padding: 12px 0;
      border-bottom: 1px solid @border;
    }
  }

  strong {
    font-size: 14px;
    line-height: 1.8;
  }

  .is-correct {
    box-shadow: inset 2px 0 @cyan;
  }

  p,
  strong {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}

.paste-explanation {
  font-size: 12px;
  line-height: 1.8;
  color: @muted;
}

@media (max-width: 480px) {
  .paste-input {
    font-size: 16px;
  }

  .paste-entry .modal-actions {
    flex-wrap: wrap;

    button {
      flex: 1;
    }
  }
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
.bank-list .bank-options,
.paste-preview .bank-options {
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

.bank-drafts {
  padding: 26px;
  margin-bottom: 20px;
}

.draft-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.draft-status {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 12px;
}

.draft-generate {
  margin-top: 18px;
}

.draft-approval {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    margin: 4px 0 0;
    flex: 0 0 auto;
    accent-color: @cyan;
  }
}

.draft-evidence {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-left: 2px solid @border;
  background: @bg;
  color: @muted;
  font-size: 13px;

  figcaption {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
    overflow-wrap: anywhere;
  }

  blockquote {
    margin: 6px 0 0;
    line-height: 1.8;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}

.draft-review .button {
  margin-top: 12px;
}
.draft-panel-enter-active, .draft-panel-leave-active { transition: opacity .24s ease, transform .24s ease; }
.draft-panel-enter, .draft-panel-leave-to { opacity: 0; transform: translateY(6px); }
.draft-list > .draft-card {
  border: 1px solid transparent;
  border-radius: 8px;
  padding-inline: 12px;
  &.draft-selected { border-color: #359bbd; background-color: #13354b; }
}
.draft-list.animated > .draft-card { transition: background-color .18s ease, border-color .18s ease; }
.draft-list.animated > .draft-item-enter-active, .draft-list.animated > .draft-item-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}
.draft-item-enter, .draft-item-leave-to { opacity: 0; transform: translateY(-4px) scale(.99); pointer-events: none; }

.bank-preview .button {
  margin-top: 20px;
}

.bank-question-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.bank-question-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.bank-delete-button {
  color: #ffb2ba;
}

.link-question-title,
.question-delete-title {
  overflow-wrap: anywhere;
}

.right-rail p {
  line-height: 1.9;
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 480px) {

  .bank-status,
  .bank-drafts,
  .bank-import,
  .bank-list {
    padding: 18px;
  }

  .draft-fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}
</style>
