<template>
  <div class="review-coach">
    <header class="page-heading">
      <div>
        <h1>AI 复习教练</h1>
        <p>从近期错题出发，找出这一轮该复习的内容。</p>
      </div>
      <div class="coach-header-actions">
        <button class="button secondary" type="button" :aria-expanded="String(showHistory)" @click="showHistory = !showHistory">
          <AppIcon name="clock" :size="16" />{{ showHistory ? "返回复习教练" : "建议历史" }}
        </button>
        <router-link :to="{ name: 'plan' }" class="button secondary">我的复习计划</router-link>
      </div>
    </header>
    <ReviewCoachHistory v-if="showHistory" :key="result?.id || 'coach-history'" />
    <div v-show="!showHistory" class="coach-grid">
      <form class="panel coach-form" @submit.prevent="preview">
        <h2>安排一次复习</h2>
        <p v-if="courseError" class="error-message" role="alert">{{ courseError }}</p>
        <label for="coach-course">选择课程</label>
        <select id="coach-course" v-model="courseId" class="input" :disabled="busy || saving" required>
          <option value="" disabled>{{ waiting ? "正在读取课程…" : "请选择课程" }}</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.name }}</option>
        </select>
        <fieldset :disabled="busy || saving">
          <legend>这次有多少时间？</legend>
          <div class="coach-time">
            <label v-for="amount in durations" :key="amount" :class="{ checked: minutes === amount }">
              <input v-model="minutes" type="radio" name="coach-minutes" :value="amount" />
              {{ amount }} 分钟
            </label>
          </div>
        </fieldset>
        <label for="coach-goal">想重点复习什么？<span>选填</span></label>
        <textarea id="coach-goal" v-model.trim="goal" class="input" :disabled="busy || saving"
          rows="3" maxlength="200" placeholder="例如：想先弄清楚 TCP 重传" />
        <button class="button primary" :disabled="busy || saving || !courseId">
          <AppIcon name="spark" :size="17" />{{ busy ? "正在查找复习内容…" : "生成复习建议" }}
        </button>
        <router-link v-if="!waiting && !courses.length && !courseError" :to="{ name: 'courses' }" class="text-button">前往新建课程</router-link>
      </form>
      <section class="panel coach-result" :class="{ animated: allowMotion }" aria-labelledby="coach-result-title" :aria-busy="String(busy)">
        <h2 id="coach-result-title">本轮复习</h2>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <div v-if="busy" class="coach-wait">
          <p role="status">正在分析近期作答，并查找讲义和练习。</p>
          <div class="coach-skeleton" aria-hidden="true">
            <div><span /><span /></div>
            <div><span /><span /><span /></div>
          </div>
        </div>
        <p v-else-if="!result && !error" class="muted">选好课程和时间后，这里会显示推荐复习的知识点。</p>
        <template v-if="result">
          <div v-if="result.focus" class="coach-focus coach-reveal">
            <div>
              <h3>{{ result.focus.label }}</h3>
              <p>近 14 天做过 {{ result.focus.total }} 道题，其中 {{ result.focus.wrong }} 道最近一次仍答错。</p>
            </div>
            <span>{{ result.minutes }} 分钟</span>
          </div>
          <p v-if="statusText" class="coach-reveal" role="status">{{ statusText }}</p>
          <section v-if="result.evidence.length" class="coach-evidence coach-reveal">
            <h3>先回看讲义</h3>
            <blockquote v-for="source in result.evidence" :key="source.materialId + ':' + source.start">
              <p>{{ source.excerpt }}</p>
              <router-link :to="sourceRoute(source)" class="text-button" target="_blank" rel="opener"
                aria-label="查看原文（在新标签页打开）">
                {{ source.name }}{{ source.page ? " · 第 " + source.page + " 页" : "" }} · 查看原文
              </router-link>
            </blockquote>
          </section>
          <section v-if="result.questions.length" class="coach-questions coach-reveal">
            <h3>再做同知识点练习</h3>
            <fieldset :disabled="saving || !!savedTask">
              <legend class="sr-only">选择要加入复习计划的题目</legend>
              <label v-for="item in result.questions" :key="item.id">
                <input v-model="selected" type="checkbox" :value="item.id" />
                <span>{{ item.title }}</span>
              </label>
            </fieldset>
          </section>
          <div class="coach-actions coach-reveal">
            <div v-if="savedTask" class="coach-saved">
              <router-link ref="startReview" class="button primary" :to="{ name: 'practice', query: { task: savedTask.id, course: result.courseId } }">开始复习</router-link>
              <router-link class="text-button" :to="{ name: 'plan' }">查看计划</router-link>
              <p role="status">已保存到今日复习计划。</p>
            </div>
            <button v-else-if="result.status === 'ready'" class="button primary" type="button" :disabled="saving || !selected.length" @click="confirm">
              {{ saving ? "正在保存…" : "确认加入复习计划（" + selected.length + " 题）" }}
            </button>
            <button v-else-if="result.status === 'drafts'" class="button primary" type="button" @click="reviewDrafts">生成并审核练习草稿</button>
            <router-link v-else class="button secondary" :to="nextRoute">{{ nextLabel }}</router-link>
          </div>
          <details class="coach-checks">
            <summary>查看推荐依据 · {{ result.mode === "ai" ? "AI 工具调用" : "按作答记录分析" }}</summary>
            <ul><li v-for="check in result.checks" :key="check">{{ check }}</li></ul>
          </details>
        </template>
      </section>
    </div>
  </div>
</template>

<script>
import { state, notify } from "../store";
import ReviewCoachHistory from "../components/ReviewCoachHistory.vue";
import { loadCourses } from "../services/courses";
import { COACH_STATUS_MESSAGES, runReviewCoach, saveCoachPlan, queueCoachDraft } from "../services/review-coach";
import { motionAllowed } from "../utils/motion";

export default {
  name: "ReviewCoach",
  components: { ReviewCoachHistory },
  data: () => ({
    state, courseId: "", minutes: 20, durations: [10, 20, 30, 45], goal: "",
    waiting: true, courseError: "", error: "", busy: false, saving: false,
    result: null, selected: [], savedTask: null, showHistory: false,
  }),
  computed: {
    allowMotion() {
      return motionAllowed();
    },
    courses() {
      return this.state.courses.filter((course) => course._remote && !course.archived);
    },
    statusText() {
      return COACH_STATUS_MESSAGES[this.result?.status] || "";
    },
    nextRoute() {
      const { courseId, status, focus } = this.result;
      if (status === "no_history") return { name: "practice", query: { course: courseId } };
      if (status === "no_evidence") return { name: "course", params: { id: courseId } };
      return { name: "question-bank", params: { id: courseId }, query: focus ? { node: focus.id } : {} };
    },
    nextLabel() {
      return { no_history: "前往练习", no_evidence: "前往上传讲义", needs_link: "前往配置题目", model_needed: "前往题库" }[this.result?.status];
    },
  },
  watch: {
    courseId: "clearResult",
    minutes: "clearResult",
    goal: "clearResult",
  },
  async created() {
    try {
      await loadCourses();
      const requested = this.$route.query.course;
      this.courseId = this.courses.find((course) => course.id === requested)?.id || this.courses[0]?.id || "";
    } catch (error) {
      this.courseError = error.message;
    } finally {
      this.waiting = false;
    }
  },
  beforeDestroy() {
    this.controller?.abort();
  },
  methods: {
    clearResult() {
      this.result = null;
      this.selected = [];
      this.savedTask = null;
      this.error = "";
    },
    async preview() {
      if (this.busy || this.saving || !this.courseId) return;
      this.clearResult();
      this.busy = true;
      this.controller = new AbortController();
      try {
        this.result = await runReviewCoach({ courseId: this.courseId, minutes: this.minutes, goal: this.goal }, this.controller.signal);
        this.selected = this.result.questions.map((item) => item.id);
      } catch (error) {
        if (error.name !== "AbortError") this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    sourceRoute(source) {
      const query = { course: this.result.courseId, material: source.materialId,
        start: String(source.start), end: String(source.end) };
      if (source.page) query.page = String(source.page);
      return { name: "studio", query };
    },
    async confirm() {
      if (this.saving || this.savedTask || !this.selected.length || this.result?.status !== "ready") return;
      this.saving = true;
      this.error = "";
      try {
        this.savedTask = await saveCoachPlan({ courseId: this.result.courseId, knowledgeNodeId: this.result.focus.id,
          minutes: this.result.minutes, questionIds: [...this.selected] });
        notify("复习计划已保存");
        this.$nextTick(() => this.$refs.startReview?.$el.focus({ preventScroll: true }));
      } catch (error) {
        this.error = error.message;
      } finally {
        this.saving = false;
      }
    },
    reviewDrafts() {
      if (this.result?.status !== "drafts") return;
      const { courseId, focus, minutes } = this.result;
      queueCoachDraft(courseId, focus.id, Math.min(5, Math.max(1, Math.floor(minutes / 5))));
      this.$router.push({ name: "question-bank", params: { id: courseId }, query: { node: focus.id, coach: "1" } });
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.coach-grid { display: grid; grid-template-columns: minmax(0, 350px) minmax(0, 1fr); gap: 20px; align-items: start; }
.coach-header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.coach-form, .coach-result { padding: 22px; min-width: 0; }
.coach-form { display: grid; gap: 12px; }
h2, h3 { margin: 0; }
h2 { font-size: 20px; }
h3 { font-size: 16px; }
fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
.coach-form legend { margin-bottom: 8px; }
.coach-form label > span { margin-left: 8px; color: @muted; font-size: 12px; }
.coach-time { display: flex; flex-wrap: wrap; gap: 7px; }
.coach-time label { padding: 6px 8px; border: 1px solid @border; border-radius: 7px; color: @muted; cursor: pointer; }
.coach-time .checked { color: @text; border-color: @cyan; }
.coach-time input, .coach-questions input { accent-color: @cyan; }
.coach-form .button { justify-self: start; }
.coach-result p { color: @muted; line-height: 1.6; overflow-wrap: anywhere; }
.coach-result .error-message { color: #ffb2ba; }
.coach-skeleton {
  display: grid;
  gap: 10px;
  > div { padding: 10px 14px; background: @surface-raised; border-radius: 8px; }
  span { display: block; width: 75%; height: 8px; margin: 8px 0; background: #24475d; border-radius: 5px; }
  span:first-child { width: 35%; height: 11px; }
  span:nth-child(3) { width: 58%; }
}
.animated .coach-skeleton span { animation: coach-waiting 1.4s ease-in-out alternate infinite; }
.animated .coach-reveal { animation: coach-reveal .28s ease-out both; }
.animated .coach-evidence { animation-delay: .09s; }
.animated .coach-questions { animation-delay: .17s; }
.animated .coach-actions { animation-delay: .23s; }
.animated .coach-saved { animation: coach-reveal .2s ease-out both; }
@keyframes coach-waiting { to { opacity: .48; } }
@keyframes coach-reveal { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.coach-focus {
  display: flex; align-items: start; justify-content: space-between; gap: 12px; margin-top: 14px;
  padding: 12px 14px; border-left: 2px solid @amber; background: @surface-raised;
  h3 { overflow-wrap: anywhere; }
  p { margin: 5px 0 0; }
  > span { color: @amber; white-space: nowrap; }
}
.coach-evidence, .coach-questions, .coach-actions { margin-top: 17px; }
.coach-evidence blockquote { margin: 8px 0; padding: 9px 12px; border-left: 2px solid @border; }
.coach-evidence blockquote p { margin: 0; }
.coach-questions label { display: flex; align-items: start; gap: 9px; margin-top: 8px; overflow-wrap: anywhere; }
.coach-actions .text-button { margin-left: 10px; }
.coach-saved p { margin: 8px 0 0; }
.coach-checks { margin-top: 16px; color: @muted; font-size: 13px; }
.coach-checks summary { cursor: pointer; }
@media (max-width: 950px) { .coach-grid { grid-template-columns: 1fr; } }
@media (max-width: 540px) { .coach-form, .coach-result { padding: 16px; } }
</style>
