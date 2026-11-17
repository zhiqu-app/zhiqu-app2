<template>
  <aside class="workspace-guide" :class="{ 'dock-moved': dock, 'dock-left': dock && dock.tagRight, dragging }"
    :style="dock ? { left: dock.x + 'px', top: dock.y + 'px' } : null" aria-label="知序向导" @keydown.esc.stop="close">
    <transition name="guide-panel" :css="allowMotion">
      <section v-if="open" id="workspace-guide-panel" class="guide-panel" :style="panelPosition" aria-labelledby="guide-title">
        <header class="guide-header">
          <span class="robot-mark robot-mark-small" aria-hidden="true"><i class="robot-visor" /></span>
          <h2 id="guide-title">知序向导</h2>
          <button class="icon-button" type="button" aria-label="收起知序向导" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </header>
        <div v-if="tab === 'welcome'" class="guide-content welcome">
          <h3>第一次来？一起走一遍。</h3>
          <p>从导入讲义到找到 AI 回答的原文，完成一次真实的学习操作。</p>
          <button class="button primary" type="button" @click="start">带我体验</button>
          <button class="button secondary" type="button" @click="tab = 'manual'">查看操作手册</button>
          <button class="text-button" type="button" @click="close">稍后再说</button>
        </div>
        <template v-else>
          <nav class="guide-nav" aria-label="向导功能">
            <button v-for="item in tabs" :key="item.id" type="button"
              :aria-pressed="String(tab === item.id)" @click="tab = item.id">{{ item.label }}</button>
            <router-link :to="{ name: 'review-coach', query: courseId ? { course: courseId } : {} }"
              @click.native="open = false">复习教练</router-link>
          </nav>
          <div v-if="tab === 'tour'" class="guide-content">
            <p class="guide-progress" aria-live="polite">已完成 {{ progress.step }} / {{ steps.length }} 步</p>
            <ol class="guide-steps">
              <li v-for="(item, index) in steps" :key="item.id"
                :aria-current="index === progress.step ? 'step' : null"
                :class="{ complete: index < progress.step }">
                <span class="step-number" aria-hidden="true">{{ index < progress.step ? "✓" : index + 1 }}</span>
                <span>{{ item.title }}</span>
              </li>
            </ol>
            <template v-if="step">
              <p>{{ step.hint }}</p>
              <p v-if="progress.courseId && knownCourse(progress.courseId)" class="guide-scope">
                {{ knownCourse(progress.courseId).name }}
              </p>
              <button class="button primary" type="button" @click="goStep">{{ progress.active ? step.action : "继续体验" }}</button>
              <button v-if="step.id === 'course' && courseId" class="text-button" type="button"
                @click="useCourse">使用已有课程</button>
              <button v-if="step.id === 'material' && hasReadyMaterial" class="text-button" type="button"
                @click="useMaterial">使用已有资料</button>
              <button v-if="progress.active" class="text-button" type="button" @click="pause">暂停体验</button>
              <button v-if="progress.step" class="text-button" type="button" @click="restart">重新开始</button>
            </template>
            <template v-else>
              <p>你已完成第一次研习。接下来可以配置知识星图，或把讲义变成练习题。</p>
              <button class="button primary" type="button" @click="tab = 'manual'">查看下一步</button>
              <button class="text-button" type="button" @click="restart">重新体验</button>
            </template>
          </div>
          <div v-else-if="tab === 'manual'" class="guide-content manual">
            <details v-for="entry in manual" :key="entry.id">
              <summary>{{ entry.title }}</summary>
              <ol><li v-for="instruction in entry.steps" :key="instruction">{{ instruction }}</li></ol>
              <button class="text-button" type="button" @click="openAction(entry.action)">前往操作</button>
            </details>
          </div>
          <div v-else class="guide-content">
            <label v-if="courses.length" class="guide-field">当前课程
              <select v-model="aiCourse" class="input" :disabled="busy">
                <option value="">通用操作</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.name }}</option>
              </select>
            </label>
            <form class="guide-form" @submit.prevent="ask">
              <label for="guide-question">你在操作哪一步遇到了问题？</label>
              <textarea id="guide-question" v-model.trim="question" class="input" rows="2" maxlength="300"
                placeholder="例如：这门课为什么不能生成练习题？" />
              <button class="button primary" :disabled="busy || !question">{{ busy ? "正在查询…" : "询问向导" }}</button>
            </form>
            <p v-if="error" class="guide-error" role="alert">{{ error }}</p>
            <button v-if="error" class="text-button" type="button" @click="tab = 'manual'">查看操作手册</button>
            <div v-if="reply" class="guide-reply" aria-live="polite">
              <span class="guide-scope">{{ reply.mode === "ai" ? "AI 向导" : "操作手册" }}</span>
              <p>{{ reply.text }}</p>
              <button class="text-button" type="button" @click="openAction(reply.action, replyCourse)">前往操作</button>
              <details v-if="reply.checks.length">
                <summary>查看查询依据</summary>
                <ul><li v-for="check in reply.checks" :key="check">{{ check }}</li></ul>
              </details>
            </div>
          </div>
        </template>
      </section>
    </transition>
    <button ref="launcher" class="guide-launcher" type="button" aria-controls="workspace-guide-panel"
      aria-label="知序向导" :aria-expanded="String(open)" @click="toggleFromLauncher" @pointerdown="grab"
      @pointermove="drag" @pointerup="release" @pointercancel="release" @lostpointercapture="release">
      <span class="robot-mark" :class="{ 'robot-blinking': playGreeting, 'robot-speaking': speaking }" aria-hidden="true">
        <i class="robot-visor" />
      </span>
      <span v-if="!open && !dragging" class="launcher-greeting" aria-hidden="true">
        <span class="greeting-measure">{{ greeting }}</span>
        <span class="greeting-text" :class="{ 'greeting-typing': playGreeting }">{{ visibleGreeting }}</span>
      </span>
    </button>
  </aside>
</template>

<script>
import { state, notify } from "../store";
import { loadCourses } from "../services/courses";
import { askWorkspaceGuide, guideEvents, guideState } from "../services/workspace-guide";
import { motionAllowed } from "../utils/motion";

const STEPS = [
  { id: "course", title: "新建课程", hint: "在「我的课程」点击「新建课程」，为讲义建一个学习空间。", action: "前往我的课程", target: "courses" },
  { id: "material", title: "导入讲义", hint: "在「课程资料」点击「导入资料」，选一份含文字的 PDF、TXT 或 Markdown。", action: "前往课程资料", target: "materials" },
  { id: "answer", title: "向讲义提问", hint: "在 AI 研习室输入一个讲义里有答案的问题，试着问一个概念的含义。", action: "进入 AI 研习室", target: "studio" },
  { id: "source", title: "核对原文", hint: "点击 AI 回答下方的原文片段，看看答案来自讲义的什么位置。", action: "查看回答的原文", target: "studio" },
];
const MANUAL = [
  { id: "materials", title: "怎样导入课程资料？", action: "materials",
    steps: ["在「我的课程」新建或选择课程。", "在课程资料区导入 PDF、TXT 或 Markdown。", "资料解析后可以在 AI 研习室提问。"] },
  { id: "studio", title: "怎样问讲义并查看原文？", action: "studio",
    steps: ["在 AI 研习室选择已导入资料的课程。", "提问后点击回答下方的原文片段。"] },
  { id: "knowledge", title: "怎样配置知识星图？", action: "knowledge",
    steps: ["进入课程的「配置知识星图」。", "添加章节和知识点，再连接有先后关系的节点并保存。"] },
  { id: "drafts", title: "怎样让 AI 生成练习题？", action: "drafts",
    steps: ["先导入可解析的讲义，并为课程配置知识点。", "打开「配置题目」，选择知识点后生成草稿。", "核对原文和答案，勾选要入库的题目。"] },
  { id: "retest", title: "怎样从错题安排复测？", action: "mistakes",
    steps: ["打开错题本，选择已关联知识点的错题。", "点击「安排同知识点复测」。", "在复习计划里打开练习并提交所选题目。"] },
];

const LAUNCHER_SIZE = 56;
const PANEL_GAP = 10;
const GREETING = "Hi，我是你的ai小助手，有问题可以点我帮忙";

export default {
  name: "WorkspaceGuide",
  props: { accountId: { type: String, required: true } },
  data: () => ({
    state, open: false, tab: "tour", dock: null, dragging: false,
    greeting: GREETING, greetingLength: 0, pageVisible: !document.hidden,
    progress: { seen: false, active: false, step: 0, courseId: "" },
    steps: STEPS, manual: MANUAL,
    tabs: [{ id: "tour", label: "带我体验" }, { id: "manual", label: "操作手册" }, { id: "ai", label: "问向导" }],
    aiCourse: "", question: "", busy: false, reply: null, replyCourse: "", error: "",
  }),
  computed: {
    panelPosition() {
      if (!this.dock) return null;
      const { panelOffset, above, room } = this.dock;
      return {
        left: panelOffset + "px",
        right: "auto",
        top: above ? "auto" : "calc(100% + 10px)",
        bottom: above ? "calc(100% + 10px)" : "auto",
        maxHeight: Math.min(650, room) + "px",
      };
    },
    allowMotion() {
      return motionAllowed();
    },
    playGreeting() {
      return this.allowMotion && this.pageVisible && !this.open && !this.dragging;
    },
    visibleGreeting() {
      return this.playGreeting ? this.greeting.slice(0, this.greetingLength) : this.greeting;
    },
    speaking() {
      return this.playGreeting && this.greetingLength > 0 && this.greetingLength < this.greeting.length;
    },
    storageKey() {
      return `zhixu-workspace-guide:${this.accountId}`;
    },
    step() {
      return this.steps[this.progress.step];
    },
    courses() {
      return this.state.courses.filter((course) => course._remote && !course.archived);
    },
    routeCourseId() {
      const id = this.$route.params.id || this.$route.query.course;
      return typeof id === "string" ? id : "";
    },
    courseId() {
      return [this.routeCourseId, this.progress.courseId, this.courses[0]?.id].find(this.knownCourse) || "";
    },
    hasReadyMaterial() {
      return this.state.materials.some((item) => item.courseId === this.progress.courseId && item.parseStatus === "ready");
    },
  },
  watch: {
    playGreeting: "restartGreeting",
    routeCourseId(id) {
      if (this.knownCourse(id) && !this.busy) this.aiCourse = id;
    },
    courses() {
      if (this.knownCourse(this.routeCourseId) && !this.busy && !this.question && !this.reply)
        this.aiCourse = this.routeCourseId;
    },
  },
  created() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (saved?.seen === true && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= STEPS.length) {
        this.progress = { seen: true, active: !!saved.active && saved.step < STEPS.length,
          step: saved.step, courseId: typeof saved.courseId === "string" ? saved.courseId : "" };
      }
    } catch (_) { /* 向导仍可在当前页面运行。 */ }
    if (!this.progress.seen) {
      this.open = true;
      this.tab = "welcome";
      this.progress.seen = true;
    }
    guideEvents.$on("complete", this.complete);
    this.save();
    this.aiCourse = this.knownCourse(this.routeCourseId) ? this.routeCourseId : "";
    loadCourses().catch(() => {});
  },
  mounted() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey + ":position"));
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) this.placeDock(saved.x, saved.y);
    } catch (_) { /* 继续使用默认位置。 */ }
    window.addEventListener("resize", this.resizeDock);
    document.addEventListener("visibilitychange", this.updateVisibility);
    this.restartGreeting();
  },
  beforeDestroy() {
    guideEvents.$off("complete", this.complete);
    window.removeEventListener("resize", this.resizeDock);
    document.removeEventListener("visibilitychange", this.updateVisibility);
    clearTimeout(this.greetingTimer);
    guideState.activeStep = "";
    this.controller?.abort();
  },
  methods: {
    updateVisibility() {
      this.pageVisible = !document.hidden;
    },
    restartGreeting() {
      clearTimeout(this.greetingTimer);
      this.greetingLength = 0;
      if (this.playGreeting) this.greetingTimer = setTimeout(this.typeGreeting, 400);
    },
    typeGreeting() {
      if (!this.playGreeting) return;
      if (this.greetingLength >= this.greeting.length) {
        this.restartGreeting();
        return;
      }
      this.greetingLength++;
      this.greetingTimer = setTimeout(this.typeGreeting,
        this.greetingLength === this.greeting.length ? 3400 : 90);
    },
    toggleFromLauncher(event) {
      if (event.detail > 0 && this.skipPointerClick) {
        this.skipPointerClick = false;
        return;
      }
      if (this.open) this.close();
      else this.show();
    },
    grab(event) {
      if (!event.isPrimary || event.button !== 0) return;
      this.skipPointerClick = false;
      const bounds = event.currentTarget.getBoundingClientRect();
      this.grabbed = {
        id: event.pointerId, startX: event.clientX, startY: event.clientY,
        x: bounds.left, y: bounds.top,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    drag(event) {
      const grab = this.grabbed;
      if (!grab || grab.id !== event.pointerId) return;
      const dx = event.clientX - grab.startX;
      const dy = event.clientY - grab.startY;
      if (!this.dragging && Math.hypot(dx, dy) < 6) return;
      this.dragging = true;
      this.placeDock(grab.x + dx, grab.y + dy);
    },
    release(event) {
      if (this.grabbed?.id !== event.pointerId) return;
      this.grabbed = null;
      if (!this.dragging) return;
      this.dragging = false;
      this.skipPointerClick = true;
      try {
        const { x, y } = this.dock;
        localStorage.setItem(this.storageKey + ":position", JSON.stringify({ x, y }));
      } catch (_) { /* 移动仍在当前页面有效。 */ }
    },
    resizeDock() {
      if (this.dock) this.placeDock(this.dock.x, this.dock.y);
    },
    placeDock(nextX, nextY) {
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const mobile = width <= 767;
      const margin = mobile ? 12 : 16;
      const nav = mobile ? this.$el.parentElement?.querySelector(".mobile-nav")?.getBoundingClientRect() : null;
      const floor = nav?.height ? Math.min(height, nav.top) - 8 : height - margin;
      const x = Math.max(margin, Math.min(nextX, width - LAUNCHER_SIZE - margin));
      const y = Math.max(margin, Math.min(nextY, floor - LAUNCHER_SIZE));
      const above = y - margin - PANEL_GAP;
      const below = floor - y - LAUNCHER_SIZE - PANEL_GAP;
      const panelWidth = Math.min(mobile ? 420 : 390, width - 2 * margin);
      const tagRight = x + LAUNCHER_SIZE / 2 < width / 2;
      const preferredLeft = tagRight ? x : x + LAUNCHER_SIZE - panelWidth;
      const panelLeft = Math.max(margin, Math.min(preferredLeft, width - margin - panelWidth));
      this.dock = { x, y, above: above >= below, room: Math.max(above, below),
        tagRight, panelOffset: panelLeft - x };
    },
    knownCourse(id) {
      return this.courses.find((course) => course.id === id);
    },
    save() {
      guideState.activeStep = this.progress.active && this.step ? this.step.id : "";
      try { localStorage.setItem(this.storageKey, JSON.stringify(this.progress)); }
      catch (_) { /* 继续保留当前页面的引导进度。 */ }
    },
    show() {
      this.open = true;
      if (this.progress.active || this.tab === "welcome") this.tab = "tour";
    },
    close() {
      if (!this.open) return;
      this.open = false;
      this.$nextTick(() => this.$refs.launcher?.focus());
    },
    start() {
      this.tab = "tour";
      this.goStep();
    },
    async goStep() {
      if (!this.step) return;
      if (this.progress.step && this.state.coursesLoaded && !this.knownCourse(this.progress.courseId)) {
        this.restart();
        notify("原来的引导课程已不可用，请重新选择课程。");
        return;
      }
      this.progress.active = true;
      this.save();
      await this.openAction(this.step.target, this.progress.courseId);
      guideState.targetRequest++;
    },
    pause() {
      this.progress.active = false;
      this.save();
    },
    restart() {
      this.progress = { seen: true, active: false, step: 0, courseId: "" };
      this.save();
    },
    useCourse() {
      this.progress.active = true;
      this.complete({ step: "course", courseId: this.courseId, accountId: this.accountId });
      this.goStep();
    },
    useMaterial() {
      this.progress.active = true;
      this.complete({ step: "material", courseId: this.progress.courseId, accountId: this.accountId });
      this.goStep();
    },
    complete({ step, courseId, accountId }) {
      if (accountId !== this.accountId || !this.progress.active || step !== this.step?.id) return;
      if (step !== "course" && courseId !== this.progress.courseId) return;
      this.progress.courseId = courseId;
      this.progress.step++;
      if (!this.step) this.progress.active = false;
      this.save();
      this.tab = "tour";
      if (!this.step) notify("已完成首次体验");
    },
    async openAction(action, preferredCourse = this.courseId) {
      const id = this.knownCourse(preferredCourse)?.id;
      const targets = {
        courses: { name: "courses" },
        materials: id ? { name: "course", params: { id } } : { name: "courses" },
        studio: { name: "studio", query: id ? { course: id } : {} },
        knowledge: id ? { name: "course-knowledge-edit", params: { id } } : { name: "courses" },
        drafts: id ? { name: "question-bank", params: { id } } : { name: "courses" },
        mistakes: { name: "mistakes", query: id ? { course: id } : {} },
        plan: { name: "plan" },
      };
      if (!Object.prototype.hasOwnProperty.call(targets, action)) return;
      const target = targets[action];
      try {
        if (this.$router.resolve(target).route.fullPath !== this.$route.fullPath && !(action === "studio" &&
            this.$route.name === "studio" && this.routeCourseId === id)) {
          await this.$router.push(target);
        }
        this.open = false;
      } catch (error) {
        if (error.name !== "NavigationDuplicated") notify("暂时无法打开目标页面，请重试。");
      }
    },
    async ask() {
      if (!this.question || this.busy) return;
      this.busy = true;
      this.error = "";
      this.reply = null;
      const courseId = this.knownCourse(this.aiCourse)?.id;
      this.controller = new AbortController();
      try {
        this.reply = await askWorkspaceGuide({
          question: this.question, page: this.$route.name || "overview", ...(courseId ? { courseId } : {}),
        }, this.controller.signal);
        this.replyCourse = courseId || "";
      } catch (error) {
        if (error.name !== "AbortError") this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.workspace-guide {
  position: fixed;
  z-index: 45;
  right: 24px;
  bottom: 22px;
  width: 56px;
  height: 56px;
  &.dock-moved { right: auto; bottom: auto; }
}
.guide-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  width: min(390px, calc(100vw - 32px));
  max-height: min(650px, calc(100dvh - 95px));
  overflow: auto;
  color: @text;
  background: @surface;
  border: 1px solid @border;
  border-radius: 12px;
  box-shadow: 0 16px 50px #010916c9;
}
.guide-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.guide-header {
  padding: 10px 14px 10px 18px;
  border-bottom: 1px solid @border;
  color: @cyan;
  h2 { margin: 0; flex: 1; color: @text; font-size: 16px; }
}
.guide-launcher {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid #2d7d9c;
  border-radius: 19px;
  background: #102d40;
  box-shadow: 0 5px 20px #01091699;
  color: #cceffc;
  touch-action: none;
  cursor: grab;
  user-select: none;
  &:hover { border-color: @cyan; }
  &:focus-visible { outline: 2px solid @cyan; outline-offset: 3px; }
  &[aria-expanded="true"] .robot-mark::after { background: @amber; }
}
.dragging .guide-launcher { cursor: grabbing; }
.launcher-greeting {
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  width: max-content;
  max-width: min(215px, calc(50vw - 50px));
  padding: 7px 10px;
  border-radius: 10px;
  background: @surface;
  border: 1px solid #2d7d9c;
  font-size: 12px;
  line-height: 1.55;
  text-align: left;
  overflow-wrap: anywhere;
  box-shadow: 0 6px 18px #01091680;
  &::after {
    position: absolute;
    content: "";
    top: calc(50% - 4px);
    right: -5px;
    width: 8px;
    height: 8px;
    background: @surface;
    border-top: 1px solid #2d7d9c;
    border-right: 1px solid #2d7d9c;
    transform: rotate(45deg);
  }
}
.dock-left .launcher-greeting {
  right: auto;
  left: calc(100% + 8px);
  &::after { right: auto; left: -5px; transform: rotate(-135deg); }
}
.greeting-measure, .greeting-text { grid-area: 1 / 1; min-width: 0; }
.greeting-measure { visibility: hidden; }
.greeting-typing::after {
  display: inline-block;
  content: "";
  height: .95em;
  border-left: 1px solid @cyan;
  margin-left: 1px;
  vertical-align: -.08em;
  animation: guide-caret .9s step-end infinite;
}
.robot-mark {
  position: relative;
  display: block;
  width: 38px;
  height: 29px;
  margin-top: 4px;
  border: 2px solid #72c7eb;
  border-radius: 9px 9px 11px 11px;
  background: #4596bc;
  box-shadow: inset 0 -3px #276581, 4px 0 0 -2px #4794ae, -4px 0 0 -2px #4794ae;
  &::before, &::after { position: absolute; content: ""; left: 50%; transform: translateX(-50%); }
  &::before { top: -7px; width: 2px; height: 6px; background: #72c7eb; }
  &::after { top: -9px; width: 5px; height: 5px; border-radius: 50%; background: #a2ffff; }
}
.robot-visor {
  position: absolute;
  inset: 3px 3px 4px;
  border-radius: 6px;
  background: #071f30;
  &::before {
    position: absolute;
    content: "";
    top: 5px;
    left: calc(50% - 6px);
    width: 3px;
    height: 5px;
    border-radius: 2px;
    background: #a2ffff;
    box-shadow: 9px 0 #a2ffff;
  }
  &::after {
    position: absolute;
    content: "";
    left: 50%;
    bottom: 3px;
    width: 5px;
    height: 3px;
    transform: translateX(-50%);
    border-bottom: 1px solid #a2ffff;
    border-radius: 0 0 5px 5px;
  }
}
.robot-blinking .robot-visor::before { animation: guide-eyes 4.6s ease-in-out infinite; }
.robot-speaking .robot-visor::after { animation: guide-mouth .39s ease-in-out infinite; }
@keyframes guide-eyes {
  0%, 30%, 36%, 100% { transform: scaleY(1); }
  33% { transform: scaleY(.13); }
}
@keyframes guide-mouth {
  0%, 100% { height: 2px; width: 5px; background: transparent; }
  42% { height: 3px; width: 4px; border-radius: 50%; background: #a2ffff; }
  73% { height: 2px; width: 5px; border-radius: 50%; background: #a2ffff; }
}
@keyframes guide-caret { 50% { opacity: 0; } }
.robot-mark-small { transform: scale(.5); margin-inline: -8px; }
.guide-content {
  padding: 16px 18px 20px;
  font-size: 14px;
  > p { margin: 10px 0; color: @muted; line-height: 1.6; }
  > .text-button { margin-left: 12px; }
  h3 { margin: 0 0 8px; font-size: 19px; }
}
.welcome { .button { margin: 6px 7px 0 0; } }
.guide-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid @border;
  button, a {
    display: grid;
    place-items: center;
    min-height: 42px;
    border-bottom: 2px solid transparent;
    color: @muted;
    &[aria-pressed="true"] { border-color: @cyan; color: @text; }
  }
}
.guide-steps {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 10px 0;
  list-style: none;
  li { display: flex; align-items: center; gap: 10px; color: @muted; }
  li[aria-current] { color: @text; .step-number { color: @amber; border-color: @amber; } }
  .complete .step-number { color: @cyan; }
}
.step-number {
  display: grid;
  place-items: center;
  min-width: 24px;
  min-height: 24px;
  border: 1px solid @border;
  border-radius: 50%;
}
.guide-scope { color: @muted; font-size: 12px; }
.manual details {
  padding: 10px 0;
  border-bottom: 1px solid @border;
  &:first-child { padding-top: 0; }
  ol { padding-left: 20px; color: @muted; line-height: 1.6; }
}
summary { cursor: pointer; }
.guide-form, .guide-field {
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
}
.guide-form textarea { width: 100%; resize: vertical; }
.guide-form button { justify-self: start; }
.guide-content > .guide-error { color: #ffb2ba; }
.guide-reply {
  padding: 11px 12px;
  background: @surface-raised;
  border-left: 2px solid @cyan;
  p { line-height: 1.65; margin: 6px 0; white-space: pre-line; overflow-wrap: anywhere; }
  details { color: @muted; margin-top: 6px; }
  ul { padding-left: 18px; }
}
.guide-panel-enter-active, .guide-panel-leave-active { transition: opacity .16s ease, transform .16s ease; }
.guide-panel-enter, .guide-panel-leave-to { opacity: 0; transform: translateY(5px); }
@media (max-width: 767px) {
  .workspace-guide { right: 12px; bottom: calc(70px + env(safe-area-inset-bottom)); }
  .guide-panel { width: min(420px, calc(100vw - 24px)); max-height: calc(100dvh - 136px); }
}
@media (prefers-reduced-motion: reduce) {
  .guide-panel-enter-active, .guide-panel-leave-active { transition: none; }
}
</style>
