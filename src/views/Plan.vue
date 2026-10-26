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
        <button
          v-for="f in filters"
          :key="f.key"
          :class="{ active: filter === f.key }"
          @click="filter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
      <span class="muted small"
        >待完成 {{ pending }} 项 · 已完成
        {{ state.tasks.length - pending }} 项</span
      >
    </div>
    <div class="content-with-aside">
      <section>
        <article
          v-for="task in filtered"
          :key="task.id"
          class="panel plan-task"
          :class="{ completed: task.done }"
        >
          <label class="task-check"
            ><input
              :checked="task.done"
              type="checkbox"
              :aria-label="'完成' + task.title"
              @change="toggleTask(task, $event)" /><span
              ><AppIcon v-if="task.done" name="check" :size="16" /></span
          ></label>
          <div class="plan-task-content">
            <span
              v-if="state.mode === 'account' && !task._remote"
              class="badge amber"
              >本机任务 · 编辑保存后可关联星图</span
            >
            <h2>{{ task.title }}</h2>
            <p>{{ task.description }}</p>
            <div class="task-meta">
              <span
                ><AppIcon name="clock" :size="15" />{{
                  task.minutes
                }}
                分钟</span
              ><span>{{ task.date || "未指定日期" }}</span
              ><span class="badge">{{ task.done ? "已完成" : "待完成" }}</span>
            </div>
          </div>
          <div class="task-actions">
            <button
              class="icon-button"
              :aria-label="'编辑' + task.title"
              @click="openEditor(task)"
            >
              <AppIcon name="edit" :size="18" /></button
            ><button
              class="icon-button"
              :aria-label="'删除' + task.title"
              @click="deleteTarget = task"
            >
              <AppIcon name="trash" :size="18" /></button
            ><router-link
              v-if="!task.done"
              :to="task.target || '/app/practice'"
              class="button secondary small-button"
              >开始复习</router-link
            >
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
            <strong>{{ pending }}</strong
            ><span>项任务等待完成</span>
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
          <router-link to="/app/mistakes" class="text-button"
            >查看错题本 <AppIcon name="arrow" :size="16"
          /></router-link>
        </section>
      </aside>
    </div>
    <AppModal
      v-if="editing"
      :title="form.id ? '编辑复习任务' : '新建复习任务'"
      @close="editing = false"
      ><form @submit.prevent="saveTask">
        <p v-if="saveError" class="error-message" role="alert">
          {{ saveError }}
        </p>
        <label class="field-label" for="task-title">任务名称</label
        ><input
          id="task-title"
          v-model.trim="form.title"
          class="input"
          maxlength="60"
          required
          placeholder="例如：回看特征值的定义"
        /><label class="field-label" for="task-description">具体要做什么</label
        ><textarea
          id="task-description"
          v-model.trim="form.description"
          class="input"
          rows="3"
          maxlength="200"
        />
        <div class="form-grid">
          <div>
            <label class="field-label" for="task-minutes">预计分钟</label
            ><input
              id="task-minutes"
              v-model.number="form.minutes"
              class="input"
              type="number"
              min="1"
              max="240"
              required
            />
          </div>
          <div>
            <label class="field-label" for="task-date">计划日期</label
            ><input
              id="task-date"
              v-model="form.date"
              class="input"
              type="date"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button
            class="button secondary"
            type="button"
            @click="editing = false"
          >
            取消</button
          ><button class="button primary" :disabled="busy || !form.title">
            {{ busy ? "正在保存…" : "保存任务" }}
          </button>
        </div>
      </form></AppModal
    ><AppModal
      v-if="deleteTarget"
      title="删除这项复习任务？"
      @close="deleteTarget = null"
      ><p>{{ deleteTarget.title }}</p>
      <div class="modal-actions">
        <button class="button secondary" @click="deleteTarget = null">
          取消</button
        ><button class="button danger" @click="remove">确认删除</button>
      </div></AppModal
    >
  </div>
</template>
<script>
import AppModal from "../components/AppModal.vue";
import { state, persist, uid, notify } from "../store";
import {
  loadTasks,
  saveTask as saveRemoteTask,
  removeTask,
} from "../services/courses";
export default {
  name: "Plan",
  components: { AppModal },
  data: () => ({
    state,
    filter: "pending",
    editing: false,
    deleteTarget: null,
    busy: false,
    saveError: "",
    form: {},
    filters: [
      { key: "pending", label: "待完成" },
      { key: "today", label: "今天" },
      { key: "all", label: "全部任务" },
      { key: "done", label: "已完成" },
    ],
  }),
  computed: {
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
          this.filter === "all" ||
          (this.filter === "today" && t.date === today) ||
          (this.filter === "done" && t.done) ||
          (this.filter === "pending" && !t.done),
      );
    },
  },
  methods: {
    async toggleTask(task, event) {
      const done = event.target.checked;
      if (state.mode === "account") {
        try {
          await saveRemoteTask({ ...task, done });
        } catch (error) {
          event.target.checked = task.done;
          notify(error.message);
        }
      } else {
        task.done = done;
        persist();
      }
    },
    openEditor(task) {
      this.saveError = "";
      this.form = task
        ? { ...task }
        : {
            title: "",
            description: "",
            minutes: 15,
            date: "",
            done: false,
            target: "/app/practice",
          };
      this.editing = true;
    },
    async saveTask() {
      if (
        this.busy ||
        !this.form.title ||
        this.form.minutes < 1 ||
        this.form.minutes > 240
      )
        return;
      if (state.mode === "account") {
        this.busy = true;
        this.saveError = "";
        try {
          await saveRemoteTask(this.form);
          this.editing = false;
          notify("复习任务已保存");
        } catch (error) {
          this.saveError = error.message;
        } finally {
          this.busy = false;
        }
        return;
      }
      if (this.form.id) {
        const task = state.tasks.find((t) => t.id === this.form.id);
        Object.assign(task, this.form);
      } else state.tasks.push({ ...this.form, id: uid() });
      persist();
      this.editing = false;
      notify("复习任务已保存");
    },
    async remove() {
      if (state.mode === "account") {
        try {
          await removeTask(this.deleteTarget);
          this.deleteTarget = null;
          notify("任务已删除");
        } catch (error) {
          notify(error.message);
        }
        return;
      }
      state.tasks = state.tasks.filter((t) => t.id !== this.deleteTarget.id);
      persist();
      this.deleteTarget = null;
      notify("任务已删除");
    },
  },
  async created() {
    try {
      await loadTasks(true);
    } catch (error) {
      notify(error.message);
    }
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

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
.task-check {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  padding: 5px;
  margin: -5px;
  input {
    position: absolute;
    opacity: 0;
    &:focus-visible + span {
      outline: 2px solid @cyan;
      outline-offset: 3px;
    }
    &:checked + span {
      background: #147596;
      border-color: #33d5f3;
    }
  }
  > span {
    width: 21px;
    height: 21px;
    border: 1px solid #32627e;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
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
  > span {
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
