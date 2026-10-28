<template>
  <div>
    <header class="page-heading">
      <div>
        <span class="eyebrow"
          >{{ course ? course.name : "课程题库"
          }}{{ current ? " · " + current.point : "" }}</span
        >
        <h1>{{ submitted ? "练习解析" : "课程巩固练习" }}</h1>
        <p>
          {{ "题目与判分来自后端，作答保存在你的账号中。" }}
        </p>
      </div>
      <div class="button-row">
        <router-link
          :to="{
            path: '/app/history',
            query: courseId ? { course: courseId } : {},
          }"
          class="button secondary"
          >作答历史</router-link
        >
        <router-link
          v-if="course && course._remote"
          :to="'/app/courses/' + course.id + '/questions'"
          class="button secondary"
          >配置题库</router-link
        ><router-link
          :to="{
            path: '/app/mistakes',
            query: course ? { course: course.id } : {},
          }"
          class="button secondary"
          >错题本</router-link
        >
      </div>
    </header>
    <section
      v-if="task && !loading && !loadError"
      class="panel practice-task"
      aria-live="polite"
    >
      <div>
        <span class="badge">习题计划</span>
        <h2>{{ task.title }}</h2>
        <p>
          <strong>{{ task.done ? "计划已完成" : "继续完成你的计划" }}</strong> ·
          已提交 {{ (task.completedQuestionIds || []).length }} /
          {{ task.questionIds.length }} 题
        </p>
        <p class="small muted">
          全部选定题目提交即完成，不要求全部答对；答错仍会进入错题本。
        </p>
      </div>
      <div class="button-row">
        <button
          v-if="task.done"
          class="button secondary"
          :disabled="busy"
          @click="restartTask"
        >
          重新练习全部题目
        </button>
        <router-link to="/app/plan" class="button secondary"
          >返回复习计划</router-link
        >
      </div>
    </section>
    <label v-if="state.courses.length" class="practice-course"
      >练习课程<select
        v-model="courseId"
        class="input"
        aria-label="练习课程"
        :disabled="busy || !!taskId || loading"
        @change="changeCourse"
      >
        <option v-for="item in state.courses" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </select></label
    >
    <section v-if="loading" class="panel empty-state" role="status">
      正在读取课程题库…
    </section>
    <section v-else-if="loadError" class="panel empty-state">
      <p class="error-message" role="alert">{{ loadError }}</p>
      <button class="button secondary" @click="load">重新加载</button>
    </section>
    <section v-else-if="!current" class="panel empty-state">
      <h2>{{ course ? "这门课程还没有可练习的题目" : "先选择或创建课程" }}</h2>
      <p>进入课程的「配置题库」，导入 JSON 题目后再开始练习。</p>
      <router-link
        :to="
          course && course._remote
            ? '/app/courses/' + course.id + '/questions'
            : '/app/courses'
        "
        class="button primary"
        >{{ course && course._remote ? "配置题库" : "我的课程" }}</router-link
      >
    </section>
    <div v-else class="content-with-aside practice-layout">
      <section class="panel question-panel">
        <div class="question-status">
          <span
            >第 <strong>{{ index + 1 }}</strong> /
            {{ questions.length }} 题</span
          >
          <div class="progress-track">
            <i
              :style="{ width: ((index + 1) / questions.length) * 100 + '%' }"
            />
          </div>
          <span><AppIcon name="clock" :size="16" />{{ time }}</span>
        </div>
        <div class="question-body">
          <span class="badge">单选题</span>
          <h2>{{ current.title }}</h2>
          <div class="answer-options" role="radiogroup" aria-label="选择答案">
            <label
              v-for="(option, i) in current.options"
              :key="i"
              class="answer-option"
              :class="{
                chosen: choice === i,
                correct: submitted && i === graded.answer,
                wrong: submitted && choice === i && choice !== graded.answer,
              }"
            >
              <input
                v-model="choice"
                type="radio"
                :value="i"
                :disabled="submitted || busy"
                name="answer"
                @change="choiceChanged"
              />
              <span class="option-letter">{{ letters[i] }}</span>
              <span>{{ option }}</span>
              <span v-if="submitted && i === graded.answer" class="badge"
                >正确答案</span
              >
            </label>
          </div>
          <p v-if="submitError" class="error-message" role="alert">
            {{ submitError }}
          </p>
          <section
            v-if="submitted"
            class="answer-explanation"
            :class="{ incorrect: choice !== graded.answer }"
            aria-live="polite"
          >
            <h3>
              <AppIcon :name="choice === graded.answer ? 'check' : 'info'" />{{
                choice === graded.answer
                  ? "理解得很准确"
                  : "这次答错了，再看一眼原理"
              }}
            </h3>
            <p>{{ graded.explanation }}</p>
            <router-link
              :to="{ path: '/app/studio', query: { course: courseId } }"
              class="source-chip"
              ><AppIcon name="file" :size="16" />回看本课程资料</router-link
            >
            <p v-if="choice !== graded.answer" class="small muted">
              本题已记录到错题本。
            </p>
          </section>
        </div>
        <footer class="question-actions">
          <button
            class="button secondary"
            :disabled="index === 0 || busy"
            @click="go(index - 1)"
          >
            上一题</button
          ><span class="muted small">{{ "后端题库 · 服务端判分" }}</span
          ><button
            v-if="!submitted"
            class="button primary"
            :disabled="choice === null || busy"
            @click="submit"
          >
            {{ busy ? "正在保存…" : "提交答案" }}</button
          ><button v-else class="button primary" @click="next">
            {{ index === questions.length - 1 ? "查看本次报告" : "下一题" }}
          </button>
        </footer>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <h2>题目目录</h2>
          <div class="question-directory">
            <button
              v-for="(q, i) in questions"
              :key="q.id"
              :class="{
                current: index === i,
                answered: answers[q.id] || isTaskQuestionCompleted(q.id),
              }"
              :aria-label="'跳转到第' + (i + 1) + '题'"
              :disabled="busy"
              @click="go(i)"
            >
              <span>{{ i + 1 }}</span
              >{{ q.point
              }}<AppIcon
                v-if="answers[q.id] || isTaskQuestionCompleted(q.id)"
                name="check"
                :size="16"
              />
            </button>
          </div>
        </section>
        <section class="panel tip-card">
          <h2>把思路写清楚</h2>
          <p>先判断题目考查的知识点，再比较每个选项。提交后可以查看解析。</p>
          <button v-if="submitted" class="text-button" @click="retry">
            重新作答本题
          </button>
        </section>
      </aside>
    </div>
  </div>
</template>
<script>
import { state, uid, notify } from "../store";
import {
  loadCourses,
  getCourse,
  getTask,
  mergeTask,
} from "../services/courses";
import {
  loadQuestions,
  loadQuestion,
  submitAnswer,
} from "../services/questions";
export default {
  name: "Practice",
  data: () => ({
    state,
    courseId: "",
    taskId: "",
    questions: [],
    index: 0,
    answers: {},
    choice: null,
    loading: true,
    loadError: "",
    submitError: "",
    busy: false,
    seconds: 0,
    startedAt: 0,
    pendingSubmission: null,
    draftKey: "",
    owner: "",
    finished: false,
    loadRevision: 0,
    letters: "ABCDEF",
  }),
  computed: {
    task() {
      return state.tasks.find((item) => item.id === this.taskId) || null;
    },
    course() {
      return state.courses.find((c) => c.id === this.courseId) || null;
    },
    current() {
      return this.questions[this.index] || null;
    },
    graded() {
      return this.answers[this.current?.id]?.result || null;
    },
    submitted() {
      return Boolean(this.graded);
    },
    time() {
      return (
        String(Math.floor(this.seconds / 60)).padStart(2, "0") +
        ":" +
        String(this.seconds % 60).padStart(2, "0")
      );
    },
  },
  created() {
    this.load();
  },
  watch: {
    "$route.fullPath"(value, old) {
      if (value !== old) {
        this.saveDraft();
        this.load();
      }
    },
  },
  mounted() {
    this.timer = setInterval(() => {
      if (this.current && !this.loading && !this.submitted && !this.busy)
        this.seconds++;
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this.timer);
    if (!this.finished) this.saveDraft();
  },
  methods: {
    async load() {
      const revision = ++this.loadRevision;
      const query = { ...this.$route.query };
      const taskId = typeof query.task === "string" ? query.task : "";
      this.loading = true;
      this.loadError = "";
      this.submitError = "";
      this.questions = [];
      this.answers = {};
      this.choice = null;
      this.pendingSubmission = null;
      this.finished = false;
      this.draftKey = "";
      this.taskId = taskId;
      try {
        if (query.task !== undefined && !taskId)
          throw new Error("计划链接无效，请返回复习计划重新打开。");
        await loadCourses();
        if (this._isDestroyed || revision !== this.loadRevision) return;
        let requested = query.question;
        let id =
          typeof query.course === "string" ? query.course : this.courseId;
        let task = null;
        if (taskId) {
          if (state.mode !== "account")
            throw new Error("请登录计划所属账号后查看习题计划。");
          task = await getTask(taskId);
          if (this._isDestroyed || revision !== this.loadRevision) return;
          if (
            task.kind !== "exercise" ||
            !task.courseId ||
            !task.questionIds?.length
          )
            throw new Error("该计划不是有效的习题计划，请返回复习计划查看。");
          id = task.courseId;
          requested = task.questionIds.includes(requested) ? requested : null;
          await getCourse(id);
          if (this._isDestroyed || revision !== this.loadRevision) return;
        } else if (state.mode === "account" && requested) {
          const question = await loadQuestion(requested);
          if (this._isDestroyed || revision !== this.loadRevision) return;
          id = question.courseId;
        }
        this.courseId =
          id ||
          state.courses.find((c) => !c.archived)?.id ||
          state.courses[0]?.id ||
          "";
        let questions = [];
        if (state.mode === "account" && this.course?._remote)
          questions = await loadQuestions(this.courseId);
        if (this._isDestroyed || revision !== this.loadRevision) return;
        if (task) {
          const byId = new Map(
            questions.map((question) => [question.id, question]),
          );
          questions = task.questionIds.map((questionId) =>
            byId.get(questionId),
          );
          if (
            questions.some(
              (question) => !question || question.courseId !== task.courseId,
            )
          )
            throw new Error("计划中的部分题目无法读取，请返回计划或重新加载。");
        }
        this.questions = questions;
        this.restoreDraft(requested);
      } catch (error) {
        if (revision === this.loadRevision && error.name !== "AbortError")
          this.loadError = error.message;
      } finally {
        if (!this._isDestroyed && revision === this.loadRevision)
          this.loading = false;
      }
    },
    restoreDraft(requested) {
      this.owner = state.mode + ":" + (state.account?.id || "demo");
      this.draftKey =
        "zhixu-practice-draft:" +
        this.owner +
        ":" +
        this.courseId +
        (this.taskId ? ":task:" + this.taskId : "");
      let draft = {};
      try {
        draft = JSON.parse(sessionStorage.getItem(this.draftKey)) || {};
      } catch (_) {}
      this.answers = {};
      for (const q of this.questions) {
        const answer = draft.answers?.[q.id];
        if (
          answer &&
          Number.isInteger(answer.choice) &&
          answer.result?.attempt?.questionId === q.id &&
          (!this.taskId ||
            (answer.result?.task?.id === this.taskId &&
              this.isTaskQuestionCompleted(q.id)))
        )
          this.answers[q.id] = answer;
      }
      const index = this.questions.findIndex((q) => q.id === requested);
      this.index =
        index >= 0
          ? index
          : Math.max(
              0,
              Math.min(Number(draft.index) || 0, this.questions.length - 1),
            );
      this.seconds =
        Number.isFinite(draft.seconds) && draft.seconds >= 0
          ? draft.seconds
          : 0;
      this.startedAt = this.seconds;
      const pending = draft.pendingSubmission;
      this.pendingSubmission =
        pending &&
        this.questions.some((question) => question.id === pending.questionId) &&
        (pending.taskId || "") === this.taskId
          ? pending
          : null;
      this.choice = this.answers[this.current?.id]?.choice ?? null;
    },
    saveDraft() {
      if (
        !this.draftKey ||
        this.owner !== state.mode + ":" + (state.account?.id || "demo")
      )
        return;
      try {
        sessionStorage.setItem(
          this.draftKey,
          JSON.stringify({
            index: this.index,
            answers: this.answers,
            seconds: this.seconds,
            pendingSubmission: this.pendingSubmission,
          }),
        );
      } catch (_) {}
    },
    choiceChanged() {
      this.submitError = "";
      if (this.pendingSubmission?.choice !== this.choice)
        this.pendingSubmission = null;
    },
    async submit() {
      if (this.choice === null || this.submitted || this.busy) return;
      const revision = this.loadRevision;
      const questionId = this.current.id;
      const choice = this.choice;
      const taskId = this.taskId;
      this.submitError = "";
      this.busy = true;
      try {
        let result;
        if (state.mode === "account") {
          if (
            !this.pendingSubmission ||
            this.pendingSubmission.questionId !== this.current.id ||
            this.pendingSubmission.choice !== this.choice
          )
            this.pendingSubmission = {
              questionId: this.current.id,
              choice: this.choice,
              seconds: Math.min(
                86400,
                Math.max(1, this.seconds - this.startedAt),
              ),
              submissionId: "practice_" + uid(),
              ...(taskId ? { taskId } : {}),
            };
          this.saveDraft();
          result = await submitAnswer(this.pendingSubmission);
          if (taskId) {
            if (result.task?.id !== taskId)
              throw new Error("计划进度响应不完整，请重试保存。");
            mergeTask(result.task);
          }
        } else throw new Error("请登录账号后提交作答。");
        if (this._isDestroyed || revision !== this.loadRevision) return;
        this.$set(this.answers, questionId, {
          choice,
          result,
        });
        this.pendingSubmission = null;
        this.saveDraft();
      } catch (error) {
        if (revision === this.loadRevision && error.name !== "AbortError")
          this.submitError = error.message || "作答尚未保存，请重试。";
      } finally {
        this.busy = false;
      }
    },
    go(index) {
      if (this.busy || index < 0 || index >= this.questions.length) return;
      this.index = index;
      this.choice = this.answers[this.current.id]?.choice ?? null;
      this.submitError = "";
      this.startedAt = this.seconds;
      this.saveDraft();
    },
    async changeCourse() {
      if (this.taskId) return;
      this.saveDraft();
      this.questions = [];
      this.answers = {};
      this.choice = null;
      this.pendingSubmission = null;
      await this.$router.replace({
        path: "/app/practice",
        query: { course: this.courseId },
      });
    },
    isTaskQuestionCompleted(id) {
      return Boolean(this.task?.completedQuestionIds?.includes(id));
    },
    restartTask() {
      if (this.busy || !this.task?.done) return;
      this.answers = {};
      this.index = 0;
      this.choice = null;
      this.pendingSubmission = null;
      this.submitError = "";
      this.startedAt = this.seconds;
      this.saveDraft();
    },
    retry() {
      this.$delete(this.answers, this.current.id);
      this.choice = null;
      this.pendingSubmission = null;
      this.startedAt = this.seconds;
      this.saveDraft();
    },
    next() {
      if (this.index < this.questions.length - 1) this.go(this.index + 1);
      else {
        this.finished = true;
        sessionStorage.removeItem(this.draftKey);
        notify("练习记录已保存");
        this.$router.push({
          path: "/app/reports",
          query: { course: this.courseId },
        });
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */
.practice-course {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  color: @muted;
  select {
    width: auto;
    max-width: 75%;
    background: @bg;
    color: @text;
  }
}
.practice-task {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  h2 {
    font-size: 17px;
    margin: 12px 0;
    overflow-wrap: anywhere;
  }
  p {
    color: @muted;
    font-size: 13px;
    line-height: 1.8;
  }
  strong {
    color: @cyan;
  }
  .button-row {
    flex-shrink: 0;
    flex-wrap: wrap;
  }
}

.question-panel {
  padding: 0;
  overflow: hidden;
}

.question-status {
  padding: 17px 24px;
  border-bottom: 1px solid #1b3c54;
  display: flex;
  align-items: center;
  gap: 20px;
  color: #a4c1dc;
  font-size: 12px;

  .progress-track {
    flex: 1;
    height: 5px;
  }

  strong {
    color: #56d9ff;
  }

  > span:last-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.question-body {
  padding: 28px 24px 35px;
  min-height: 400px;

  h2 {
    font-size: 19px;
    line-height: 1.9;
    margin: 22px 0;
  }
}

.answer-explanation {
  border: 1px solid #20738a;
  background: #0c344346;
  border-radius: 7px;
  padding: 20px;
  margin-top: 25px;

  h3 {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #4de1ec;
    margin-bottom: 10px;
    font-size: 16px;
  }

  p {
    color: #a4c9e2;
    font-size: 14px;
  }

  .small {
    font-size: 11px;
    margin: 15px 0 0;
  }

  &.incorrect h3 {
    color: #ffc370;
  }
}

.question-actions {
  border-top: 1px solid #24445c;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.question-directory {
  display: grid;
  gap: 8px;

  button {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 9px;
    text-align: left;
    color: #9cbedc;
    font-size: 13px;
    border: 1px solid transparent;
    border-radius: 5px;

    > span {
      width: 25px;
      height: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #15334a;
      border-radius: 50%;
    }

    .app-icon {
      margin-left: auto;
      color: #20cbe9;
    }

    &.current {
      border-color: #1c6f9c;
      background: #0b3851;
      color: #d4f4ff;
    }

    &.answered > span {
      background: #125e80;
    }
  }
}

@media (max-width: 767px) {
  .practice-task {
    align-items: flex-start;
    flex-direction: column;
  }
  .question-status {
    padding: 14px;
    gap: 12px;
    font-size: 11px;
  }

  .question-body {
    padding: 23px 16px;
    min-height: 0;

    h2 {
      font-size: 17px;
    }
  }

  .answer-explanation {
    padding: 16px;

    h3 {
      font-size: 14px;
    }

    p {
      font-size: 13px;
    }
  }

  .question-actions {
    padding: 14px;
    position: sticky;
    bottom: 0;
    background: #0b2337;

    > .small {
      display: none;
    }
  }

  .practice-layout .right-rail {
    display: none;
  }

  .question-panel {
    padding: 18px 15px;
  }
}
</style>
