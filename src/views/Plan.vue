<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>把建议变成今天能完成的小任务</h1>
        <p>每一次有方向的复习，都是向理解更近一步。</p>
      </div>
      <button class="button primary" @click="openEditor()">
        <AppIcon name="plus" />新建任务
      </button>
    </header>
    <div class="filter-bar panel">
      <div class="tabs">
        <button v-for="f in filters" :key="f.key" :class="{ active: filter === f.key }" @click="filter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div class="plan-kind-filter">
        <label for="task-kind-filter">任务类型筛选</label>
        <select id="task-kind-filter" v-model="kindFilter" class="input">
          <option value="all">全部类型</option>
          <option value="custom">自定义规划</option>
          <option value="exercise">习题计划</option>
        </select>
      </div>
      <span class="muted small">待完成 {{ pending }} 项 · 已完成
        {{ state.tasks.length - pending }} 项</span>
    </div>
    <div class="content-with-aside">
      <section>
        <article v-for="task in filtered" :key="task.id" class="panel plan-task" :class="{ completed: task.done }">
          <div v-if="task.kind === 'exercise'" class="exercise-mark" :title="task.done ? '计划已完成' : '提交全部选定题目后完成'">
            <AppIcon :name="task.done ? 'check' : 'file'" :size="21" />
          </div>
          <div v-else class="exercise-mark" :title="task.done ? '计划已完成' : '完成全部小任务后自动完成'">
            <AppIcon :name="task.done ? 'check' : 'file'" :size="21" />
          </div>
          <div class="plan-task-content">
            <span v-if="state.mode === 'account' && !task._remote" class="badge amber">本机任务 · 编辑保存后可关联星图</span>
            <h2>{{ task.title }}</h2>
            <p>{{ task.description }}</p>
            <p v-if="task.kind === 'exercise'" class="exercise-progress">
              习题计划 · 已提交 {{ (task.completedQuestionIds || []).length }} / {{ (task.questionIds || []).length }} 题
            </p>
            <div v-else class="task-checklist">
              <p class="subtask-progress">
                已完成 {{ completedSubtasks(task) }} / {{ (task.subtasks || []).length }} 项
              </p>
              <ul :aria-label="task.title + '的小任务'">
                <li v-for="subtask in task.subtasks" :key="subtask.id">
                  <label :class="{ checked: subtask.done }">
                    <input type="checkbox" :checked="subtask.done" :disabled="isTaskLocked(task)"
                      :aria-label="'完成小任务：' + subtask.title" @change="toggleSubtask(task, subtask, $event)" />
                    <span>{{ subtask.title }}</span>
                  </label>
                </li>
              </ul>
              <p v-if="subtaskPending[task.id]" role="status" class="small muted">
                正在保存小任务…
              </p>
              <p v-if="subtaskErrors[task.id]" class="error-message" role="alert">
                {{ subtaskErrors[task.id].message }}
                <button class="text-button" type="button" :disabled="!!subtaskPending[task.id]"
                  @click="retrySubtask(task)">
                  重试勾选
                </button>
              </p>
            </div>
            <div class="task-meta">
              <span>
                <AppIcon name="clock" :size="15" />{{
                  task.minutes
                }}
                分钟
              </span><span>{{ task.date || "未指定日期" }}</span><span class="badge">{{ task.done ? "已完成" : "待完成" }}</span>
              <span v-if="task.reminderAt">提醒：{{ formatTime(task.reminderAt) }}</span>
              <span v-if="task.completedAt">完成：{{ formatTime(task.completedAt) }}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="icon-button" :aria-label="'编辑' + task.title" :disabled="isTaskLocked(task)"
              @click="openEditor(task)">
              <AppIcon name="edit" :size="18" />
            </button>
            <button class="icon-button" :aria-label="'删除' + task.title" :disabled="isTaskLocked(task)"
              @click="requestDelete(task)">
              <AppIcon name="trash" :size="18" />
            </button>
            <router-link v-if="task.kind === 'exercise'
              || (task.target && task.target !== '/app/practice')" :to="task.target || '/app/practice'"
              class="button secondary small-button">
              {{
                task.kind === "exercise"
                  ? task.done
                    ? "查看练习"
                    : "开始复习"
                  : "打开学习资料"
              }}
            </router-link>
          </div>
        </article>
        <div v-if="!filtered.length" class="panel empty-state">
          <AppIcon name="calendar" :size="40" />
          <h2>给下一次学习留个位置</h2>
          <p>新建一项小任务，让复习更具体。</p>
          <button class="button primary" @click="openEditor()">新建任务</button>
        </div>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <h2>你的复习节奏</h2>
          <div class="plan-count">
            <strong>{{ pending }}</strong><span>项任务等待完成</span>
          </div>
          <p class="muted">建议每次专注 15–25 分钟。完成后休息一下，再继续。</p>
          <div class="progress-track">
            <i :style="{ width: completion + '%' }" />
          </div>
          <p class="small muted">已完成 {{ completion }}%</p>
        </section>
        <section class="panel tip-card">
          <AppIcon name="spark" />
          <h2>从错题开始</h2>
          <p>不知道该复习什么？到错题本中，把还没掌握的知识点加入计划。</p>
          <router-link to="/app/mistakes" class="text-button">
            查看错题本
            <AppIcon name="arrow" :size="16" />
          </router-link>
        </section>
      </aside>
    </div>
    <AppModal v-if="editing" :title="form.id ? '编辑复习任务' : '新建复习任务'" @close="editing = false">
      <form @submit.prevent="saveTask">
        <p v-if="saveError" class="error-message" role="alert">
          {{ saveError }}
        </p>
        <label class="field-label" for="task-kind">任务类型</label>
        <select id="task-kind" v-model="form.kind" class="input" :disabled="!!form.id" @change="changeKind">
          <option value="custom">自定义规划 · 完成全部小任务</option>
          <option value="exercise" :disabled="state.mode !== 'account'">
            习题计划 · 提交选定题目后完成
          </option>
        </select>
        <p v-if="state.mode !== 'account'" class="small muted">
          体验模式可创建自定义规划；登录后可从账号题库安排习题。
        </p>
        <section v-if="form.kind === 'exercise'" class="task-question-picker">
          <p class="small muted">
            全部选定题目提交即完成，不要求全部答对；答错仍会进入错题本。
          </p>
          <label class="field-label" for="task-course">计划课程</label>
          <select id="task-course" v-model="form.courseId" class="input" :disabled="!!form.id || questionsLoading"
            @change="loadTaskQuestions(true)">
            <option value="">请选择课程</option>
            <option v-for="course in remoteCourses" :key="course.id" :value="course.id">
              {{ course.name }}
            </option>
          </select>
          <p v-if="questionsLoading" role="status" class="small muted">
            正在读取题库…
          </p>
          <div v-else-if="questionsError">
            <p class="error-message" role="alert">{{ questionsError }}</p>
            <button class="text-button" type="button" @click="loadTaskQuestions(false)">
              重试题库
            </button>
          </div>
          <p v-else-if="form.courseId && !taskQuestions.length" class="small muted">
            这门课程还没有题目，请先到课程中配置题库。
          </p>
          <fieldset v-else-if="taskQuestions.length" class="task-questions">
            <legend>选择题目（已选 {{ form.questionIds.length }} 题）</legend>
            <label v-for="question in taskQuestions" :key="question.id">
              <input v-model="form.questionIds" type="checkbox" :value="question.id" :disabled="!!form.id" />
              <span>{{ question.title }}<small>{{ question.point }}</small></span>
            </label>
          </fieldset>
          <p v-if="form.id" class="small muted">
            已保存计划的课程和题目固定，进度持续保留。需要其他题目时请新建计划。
          </p>
        </section>
        <label class="field-label" for="task-title">任务名称</label>
        <input id="task-title" v-model.trim="form.title" class="input" maxlength="60" required
          placeholder="例如：回看特征值的定义" />
        <label class="field-label" for="task-description">具体要做什么</label>
        <textarea id="task-description" v-model.trim="form.description" class="input" rows="3" maxlength="200" />
        <fieldset v-if="form.kind === 'custom'" class="subtask-editor">
          <legend>小任务（{{ form.subtasks.length }} / 100）</legend>
          <p class="small muted">
            逐项勾选后记录进度，全部完成时大任务自动完成。
          </p>
          <div v-for="(subtask, index) in form.subtasks" :key="subtask.id || subtask._key" class="subtask-edit-row">
            <input v-model.trim="subtask.title" class="input" :aria-label="'小任务' + (index + 1)" maxlength="200" required
              placeholder="填写一项具体步骤" />
            <button type="button" class="icon-button" :aria-label="'删除小任务' + (index + 1)"
              :disabled="form.subtasks.length === 1" @click="form.subtasks.splice(index, 1)">
              <AppIcon name="trash" :size="18" />
            </button>
          </div>
          <button type="button" class="text-button" :disabled="form.subtasks.length >= 100" @click="addSubtask">
            添加小任务
          </button>
        </fieldset>
        <div class="form-grid">
          <div>
            <label class="field-label" for="task-minutes">预计分钟</label><input id="task-minutes" v-model.number="form.minutes" class="input" type="number" min="1" max="240" required />
          </div>
          <div>
            <label class="field-label" for="task-date">计划日期</label><input id="task-date" v-model="form.date"
              class="input" type="date" />
          </div>
        </div>
        <label class="field-label" for="task-reminder">提醒时间</label>
        <input id="task-reminder" v-model="form.reminderLocal" class="input" type="datetime-local" />
        <p class="small muted">可选，按本地时间设置；留空则不提醒。</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" @click="editing = false">
            取消</button><button class="button primary" :disabled="busy ||
              !form.title ||
              (form.kind === 'custom' && !validSubtasks) ||
              (form.kind === 'exercise' &&
                (!form.courseId ||
                  !form.questionIds.length ||
                  questionsLoading ||
                  !!questionsError))
              ">
            {{ busy ? "正在保存…" : "保存任务" }}
          </button>
        </div>
      </form>
    </AppModal>
    <AppModal v-if="deleteTarget" title="删除这项复习任务？" @close="deleteTarget = null">
      <p>{{ deleteTarget.title }}</p>
      <div class="modal-actions">
        <button class="button secondary" @click="deleteTarget = null"> 取消</button>
        <button class="button danger" @click="remove">确认删除</button>
      </div>
    </AppModal>
  </div>
</template>
<script>
import AppModal from "../components/AppModal.vue";
import { state, persist, uid, notify } from "../store";
import {
  loadTasks,
  loadCourses,
  saveTask as saveRemoteTask,
  removeTask,
  toggleSubtask as toggleRemoteSubtask,
} from "../services/courses";
import { loadQuestions } from "../services/questions";
export default {
  name: "Plan",
  components: { AppModal },
  data: () => ({
    state,
    editing: false,
    deleteTarget: null,
    busy: false,
    saveError: "",
    subtaskPending: {},
    subtaskErrors: {},
    form: {},
    taskQuestions: [],
    questionsLoading: false,
    questionsError: "",
    questionsRevision: 0,
    filters: [
      { key: "pending", label: "待完成" },
      { key: "today", label: "今天" },
      { key: "all", label: "全部任务" },
      { key: "done", label: "已完成" },
    ],
  }),
  computed: {
    // 筛选由路由保存，消息跳转、同页切换及刷新使用同一份状态。
    filter: {
      get() {
        const value = this.$route.query.filter;
        return this.filters.some((item) => item.key === value)
          ? value
          : "pending";
      },
      set(value) {
        this.setFilterQuery({ filter: value });
      },
    },
    kindFilter: {
      get() {
        const value = this.$route.query.kind;
        return ["custom", "exercise"].includes(value) ? value : "all";
      },
      set(value) {
        this.setFilterQuery({ kind: value });
      },
    },
    validSubtasks() {
      return (
        this.form.subtasks?.length >= 1 &&
        this.form.subtasks.length <= 100 &&
        this.form.subtasks.every(
          (item) =>
            item.title.trim().length >= 1 && item.title.trim().length <= 200,
        )
      );
    },
    remoteCourses() {
      return state.courses.filter(
        (course) => course._remote && !course.archived,
      );
    },
    pending() {
      return state.tasks.filter((t) => !t.done).length;
    },
    completion() {
      return state.tasks.length
        ? Math.round(
          ((state.tasks.length - this.pending) / state.tasks.length) * 100,
        )
        : 0;
    },
    filtered() {
      const today = new Date().toLocaleDateString("sv-SE");
      return state.tasks.filter(
        (t) =>
          (this.kindFilter === "all" ||
            (t.kind || "custom") === this.kindFilter) &&
          (this.filter === "all" ||
            (this.filter === "today" && t.date === today) ||
            (this.filter === "done" && t.done) ||
            (this.filter === "pending" && !t.done)),
      );
    },
  },
  methods: {
    setFilterQuery(values) {
      this.$router
        .replace({
          path: this.$route.path,
          query: { ...this.$route.query, ...values },
        })
        .catch(() => {});
    },
    formatTime(value) {
      const time = new Date(value);
      return Number.isNaN(time.getTime())
        ? value
        : time.toLocaleString("zh-CN", { hour12: false });
    },
    completedSubtasks(task) {
      return (task.subtasks || []).filter((item) => item.done).length;
    },
    async toggleSubtask(task, subtask, event) {
      const done = event.target.checked;
      // Native input changes before Vue renders; keep it at the last saved value
      // while the server owns the update, including when a request fails.
      event.target.checked = Boolean(subtask.done);
      await this.setSubtask(task, subtask.id, done);
    },
    isTaskLocked(task) {
      return Boolean(
        this.subtaskPending[task.id] ||
        (this.form.id === task.id && (this.editing || this.busy)),
      );
    },
    async setSubtask(task, subtaskId, done) {
      if (task.kind === "exercise" || this.isTaskLocked(task)) return;
      this.$set(this.subtaskPending, task.id, true);
      this.$delete(this.subtaskErrors, task.id);
      try {
        await toggleRemoteSubtask(task.id, subtaskId, done);
      } catch (error) {
        this.$set(this.subtaskErrors, task.id, {
          message: error.message,
          subtaskId,
          done,
        });
      } finally {
        this.$delete(this.subtaskPending, task.id);
      }
    },
    retrySubtask(task) {
      const failed = this.subtaskErrors[task.id];
      if (failed) this.setSubtask(task, failed.subtaskId, failed.done);
    },
    addSubtask() {
      if (this.form.subtasks.length < 100)
        this.form.subtasks.push({ _key: uid(), title: "" });
    },
    openEditor(task) {
      if (this.busy || (task && this.isTaskLocked(task))) return;
      this.saveError = "";
      this.form = task
        ? {
          ...task,
          kind: task.kind || "custom",
          questionIds: [...(task.questionIds || [])],
          courseId: task.courseId || "",
          reminderLocal: this.toLocalTime(task.reminderAt),
          subtasks: (task.subtasks || []).map((item) => ({
            id: item.id,
            title: item.title,
          })),
        }
        : {
          title: "",
          description: "",
          minutes: 15,
          date: "",
          subtasks: [{ _key: uid(), title: "" }],
          target: "/app/practice",
          kind: "custom",
          courseId: "",
          questionIds: [],
          reminderLocal: "",
        };
      this.taskQuestions = [];
      this.questionsError = "";
      this.editing = true;
      if (this.form.kind === "exercise") this.loadTaskQuestions(false);
    },
    toLocalTime(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    },
    changeKind() {
      this.form.courseId = "";
      this.form.questionIds = [];
      this.taskQuestions = [];
      this.questionsError = "";
      ++this.questionsRevision;
      this.questionsLoading = false;
    },
    async loadTaskQuestions(clear) {
      const revision = ++this.questionsRevision;
      if (clear) this.form.questionIds = [];
      this.taskQuestions = [];
      this.questionsError = "";
      if (!this.form.courseId) return;
      this.questionsLoading = true;
      try {
        const questions = await loadQuestions(this.form.courseId);
        if (revision === this.questionsRevision) this.taskQuestions = questions;
      } catch (error) {
        if (revision === this.questionsRevision)
          this.questionsError = error.message;
      } finally {
        if (revision === this.questionsRevision) this.questionsLoading = false;
      }
    },
    async saveTask() {
      if (
        this.busy ||
        !this.editing ||
        this.subtaskPending[this.form.id] ||
        !this.form.title ||
        this.form.minutes < 1 ||
        this.form.minutes > 240
      )
        return;
      if (
        this.form.kind === "exercise" &&
        (!this.form.courseId ||
          !this.form.questionIds.length ||
          this.questionsLoading ||
          this.questionsError)
      )
        return;
      if (this.form.kind === "custom" && !this.validSubtasks) {
        this.saveError = "请填写 1 至 100 项小任务，每项标题不超过 200 字。";
        return;
      }
      const reminder = this.form.reminderLocal
        ? new Date(this.form.reminderLocal)
        : null;
      if (reminder && Number.isNaN(reminder.getTime())) {
        this.saveError = "请输入有效的提醒时间。";
        return;
      }
      const payload = {
        ...this.form,
        reminderAt: reminder ? reminder.toISOString() : null,
      };
      if (payload.kind === "custom") {
        delete payload.done;
        payload.subtasks = this.form.subtasks.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          title: item.title.trim(),
        }));
      }
      this.busy = true;
      this.saveError = "";
      try {
        await saveRemoteTask(payload);
        this.editing = false;
        notify("复习任务已保存");
      } catch (error) {
        this.saveError = error.message;
      } finally {
        this.busy = false;
      }
    },
    requestDelete(task) {
      if (!this.isTaskLocked(task)) this.deleteTarget = task;
    },
    async remove() {
      if (!this.deleteTarget || this.isTaskLocked(this.deleteTarget)) return;
      try {
        await removeTask(this.deleteTarget);
        this.deleteTarget = null;
        notify("任务已删除");
      } catch (error) {
        notify(error.message);
      }
    },
  },
  async created() {
    try {
      await Promise.all([loadTasks(true), loadCourses()]);
    } catch (error) {
      notify(error.message);
    }
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */
.filter-bar {
  flex-wrap: wrap;
  gap: 14px;
}

.plan-kind-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  color: @muted;
  font-size: 12px;

  .input {
    width: auto;
    min-width: 130px;
    background: @bg;
  }
}

.plan-task {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 16px;
  padding: 23px;

  &.completed .plan-task-content {
    opacity: 0.6;

    h2 {
      text-decoration: line-through;
    }
  }

  h2 {
    margin: 0 0 8px;
    font-size: 17px;
  }

  p {
    color: #8db2ce;
    font-size: 13px;
  }
}

.exercise-mark {
  color: @cyan;
  padding-top: 3px;
}

.task-question-picker {
  margin: 16px 0;
  padding: 14px;
  border: 1px solid @border;
  border-radius: 7px;

  p {
    line-height: 1.8;
  }
}

.task-questions {
  border: 0;
  margin: 15px 0 0;
  padding: 0;
  max-height: 230px;
  overflow-y: auto;

  legend {
    font-size: 12px;
    color: @muted;
    margin-bottom: 8px;
  }

  label {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    align-items: flex-start;
    cursor: pointer;
    border-top: 1px solid @border;
  }

  input {
    margin-top: 5px;
    accent-color: @cyan;
    flex-shrink: 0;
  }

  span {
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  small {
    display: block;
    color: @muted;
    margin-top: 5px;
  }
}

.task-checklist {
  margin: 14px 0;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li+li {
    border-top: 1px solid @border;
  }

  label {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 0;
    font-size: 13px;
    line-height: 1.6;
    cursor: pointer;
  }

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    flex-shrink: 0;
    accent-color: @cyan;
  }

  input:disabled {
    cursor: wait;
  }

  .checked span {
    color: @muted;
    text-decoration: line-through;
  }

  .error-message {
    line-height: 1.8;
  }
}

.subtask-editor {
  min-width: 0;
  margin: 18px 0;
  padding: 14px;
  border: 1px solid @border;
  border-radius: 7px;

  legend {
    padding: 0 6px;
    font-size: 13px;
  }
}

.subtask-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 10px 0;

  .input {
    min-width: 0;
    flex: 1;
  }

  .icon-button {
    flex-shrink: 0;
  }
}

.plan-task-content {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 11px;
  color: #78a5c6;

  >span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
}

.task-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;

  .button {
    margin-left: 8px;
  }

  .icon-button {
    width: 30px;
    height: 34px;
  }
}

.plan-count {
  display: flex;
  gap: 16px;
  align-items: center;
  margin: 25px 0;

  strong {
    font-size: 48px;
    line-height: 1;
    color: #37ccff;
    font-weight: 400;
  }

  span {
    color: #9cbed9;
    font-size: 13px;
  }
}

@media (max-width: 1199px) {
  .plan-task {
    gap: 13px;
    padding: 20px 16px;

    .task-actions {
      max-width: 100px;
    }
  }
}

@media (max-width: 767px) {
  .plan-task {
    gap: 12px;
    flex-wrap: wrap;
    padding: 20px 16px;

    .plan-task-content {
      min-width: calc(100% - 45px);
    }

    .task-actions {
      margin-left: auto;
      max-width: none;

      .button {
        margin-left: 12px;
      }
    }

    .task-meta {
      gap: 10px;
      flex-wrap: wrap;
    }
  }
}
</style>
