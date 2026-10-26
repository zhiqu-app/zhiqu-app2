<template>
  <div>
    <header class="page-heading graph-editor-heading">
      <div>
        <router-link
          :to="course ? '/app/courses/' + course.id : '/app/courses'"
          class="text-button"
          >返回课程</router-link
        >
        <h1>配置课程知识星图</h1>
        <p>
          {{
            course ? course.name : "先选择一门课程"
          }}：把知识点和学习任务连起来。
        </p>
      </div>
      <button
        v-if="course && course._remote && !loading && !loadError"
        class="button primary"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? "正在保存…" : "保存课程星图" }}
      </button>
    </header>
    <section v-if="loading" class="panel editor-status" role="status">
      正在读取这门课程的星图…
    </section>
    <section v-else-if="loadError" class="panel editor-status">
      <p class="error-message" role="alert">{{ loadError }}</p>
      <button class="button secondary" @click="load">重新加载</button>
    </section>
    <section v-else-if="state.mode !== 'account'" class="panel editor-status">
      <h2>登录后保存课程星图</h2>
      <router-link to="/login" class="button primary">登录账号</router-link>
    </section>
    <section v-else-if="course && !course._remote" class="panel editor-status">
      <h2>先把这门本机课程保存到账号</h2>
      <p>旧资料会保留在本机，课程同步后即可保存星图。</p>
      <button class="button primary" :disabled="saving" @click="sync">
        同步课程并继续
      </button>
    </section>
    <div v-else-if="course" class="graph-editor-layout">
      <form class="panel graph-editor-form" @submit.prevent="save">
        <fieldset :disabled="saving">
          <label class="field-label" for="graph-title">星图标题</label
          ><input
            id="graph-title"
            v-model="title"
            class="input"
            maxlength="80"
            required
          />
          <label class="field-label" for="graph-goal"
            >课程学习目标（选填）</label
          ><textarea
            id="graph-goal"
            v-model="goal"
            class="input"
            maxlength="180"
            rows="2"
            placeholder="例如：完成抓包实验，理解可靠传输"
          />
          <div class="editor-section-heading">
            <h2>
              知识点 <small>{{ nodes.length }}/50</small>
            </h2>
            <button
              type="button"
              class="text-button"
              :disabled="nodes.length >= 50"
              @click="addNode"
            >
              添加知识点
            </button>
          </div>
          <p v-if="!nodes.length" class="muted">
            还没有知识点。先添加一个你准备学习的概念或任务。
          </p>
          <article
            v-for="(node, index) in nodes"
            :key="node.id"
            class="node-editor"
          >
            <div class="node-editor-heading">
              <strong>知识点 {{ index + 1 }}</strong
              ><button
                type="button"
                class="text-button"
                :aria-label="'删除知识点 ' + (index + 1)"
                @click="removeNode(node.id)"
              >
                删除
              </button>
            </div>
            <label class="field-label" :for="'node-label-' + node.id"
              >知识点名称 {{ index + 1 }}</label
            ><input
              :id="'node-label-' + node.id"
              v-model="node.label"
              class="input"
              maxlength="80"
              required
              placeholder="自己填写知识点名称"
            />
            <label class="field-label" :for="'node-description-' + node.id"
              >知识点说明 {{ index + 1 }}</label
            ><textarea
              :id="'node-description-' + node.id"
              v-model="node.description"
              class="input"
              rows="2"
              maxlength="5000"
              placeholder="要理解什么，准备做什么"
            />
            <label class="field-label" :for="'node-task-' + node.id"
              >关联任务 {{ index + 1 }}</label
            ><select
              :id="'node-task-' + node.id"
              v-model="node.taskId"
              class="input"
            >
              <option :value="null">不关联任务</option>
              <option
                v-for="task in availableTasks"
                :key="task.id"
                :value="task.id"
              >
                {{ task.title }}{{ task.done ? "（已完成）" : "" }}
              </option>
            </select>
            <details class="node-position">
              <summary>调整节点位置（选填）</summary>
              <div class="form-grid">
                <label
                  >横坐标<input
                    v-model.number="node.x"
                    class="input"
                    type="number"
                    min="0"
                    max="760"
                    step="1"
                    required /></label
                ><label
                  >纵坐标<input
                    v-model.number="node.y"
                    class="input"
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    required
                /></label>
              </div>
            </details>
          </article>
          <p v-if="taskError" class="error-message">{{ taskError }}</p>
          <button type="button" class="text-button" @click="refreshTasks">
            刷新任务列表
          </button>
          <p class="muted small">
            任务为选填；可先在「复习计划」保存任务，再回来关联。
          </p>
          <div class="editor-section-heading">
            <h2>先后关系</h2>
            <button
              type="button"
              class="text-button"
              :disabled="!nodes.length"
              @click="arrange"
            >
              自动排布节点
            </button>
          </div>
          <div class="edge-inputs">
            <label
              >连线起点<select
                v-model="source"
                class="input"
                aria-label="连线起点"
              >
                <option value="">选择起点</option>
                <option
                  v-for="(node, i) in nodes"
                  :key="node.id"
                  :value="node.id"
                >
                  {{ node.label || "未命名知识点 " + (i + 1) }}
                </option>
              </select></label
            ><label
              >连线终点<select
                v-model="target"
                class="input"
                aria-label="连线终点"
              >
                <option value="">选择终点</option>
                <option
                  v-for="(node, i) in nodes"
                  :key="node.id"
                  :value="node.id"
                >
                  {{ node.label || "未命名知识点 " + (i + 1) }}
                </option>
              </select></label
            ><button
              type="button"
              class="button secondary"
              :disabled="!source || !target || links.length >= 150"
              @click="addLink"
            >
              添加连接
            </button>
          </div>
          <ul class="edge-list">
            <li
              v-for="(link, i) in links"
              :key="link.source + ':' + link.target"
            >
              <span>{{ label(link.source) }} → {{ label(link.target) }}</span
              ><button
                type="button"
                class="text-button"
                :aria-label="'删除连接 ' + (i + 1)"
                @click="links.splice(i, 1)"
              >
                移除
              </button>
            </li>
          </ul>
          <p v-if="!links.length" class="muted small">
            尚未连接知识点。先后关系可形成分支，不要求每个点都相连。
          </p>
        </fieldset>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <button v-if="conflict" type="button" class="text-button" @click="load">
          重新加载最新星图（替换未保存内容）
        </button>
        <button
          class="button primary full-width"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? "正在保存…" : "保存课程星图" }}
        </button>
      </form>
      <aside class="panel editor-preview">
        <span class="badge">实时预览</span>
        <h2>{{ title || course.name }}</h2>
        <p class="muted">
          {{ goal || "知识点由你设定，连接表示学习的先后顺序。" }}
        </p>
        <KnowledgeGraph
          v-if="nodes.length"
          :title="title"
          :nodes="previewNodes"
          :edges="previewEdges"
          :selected="selectedNode ? selectedNode.id : ''"
          @select="selectedId = $event.id"
        />
        <div v-else class="editor-preview-empty">
          <AppIcon name="graph" :size="44" />
          <p>添加知识点后，在这里查看连接。</p>
        </div>
        <div v-if="selectedNode" class="node-preview-detail">
          <strong>{{ selectedNode.label || "未命名知识点" }}</strong>
          <p>
            {{
              selectedNode.description || "可在左侧补充这个知识点的学习要求。"
            }}
          </p>
          <p v-if="selectedTask" class="badge">
            关联任务：{{ selectedTask.title
            }}{{ selectedTask.done ? "（已完成）" : "" }}
          </p>
        </div>
        <p class="muted small">
          只修改当前课程。删除知识点会同时移除它的连接，不会删除复习任务或课程资料。
        </p>
      </aside>
    </div>
  </div>
</template>
<script>
import KnowledgeGraph from "../components/KnowledgeGraph.vue";
import { state, uid, notify } from "../store";
import { getCourse, loadTasks, syncLocalCourse } from "../services/courses";
import { loadCourseGraph, saveCourseGraph } from "../services/course-knowledge";

export default {
  name: "CourseKnowledgeEditor",
  components: { KnowledgeGraph },
  data: () => ({
    state,
    course: null,
    title: "",
    goal: "",
    revision: 0,
    nodes: [],
    links: [],
    source: "",
    target: "",
    selectedId: "",
    loading: true,
    saving: false,
    loadError: "",
    taskError: "",
    error: "",
    conflict: false,
    loadRevision: 0,
  }),
  computed: {
    availableTasks() {
      return state.tasks.filter((task) => task._remote);
    },
    previewNodes() {
      return this.nodes.map((node, i) => ({
        ...node,
        label: node.label || "知识点 " + (i + 1),
      }));
    },
    previewEdges() {
      return this.links.map((link) => [
        this.nodes.findIndex((node) => node.id === link.source),
        this.nodes.findIndex((node) => node.id === link.target),
      ]);
    },
    selectedNode() {
      return (
        this.nodes.find((node) => node.id === this.selectedId) ||
        this.nodes[0] ||
        null
      );
    },
    selectedTask() {
      return (
        this.availableTasks.find(
          (task) => task.id === this.selectedNode?.taskId,
        ) || null
      );
    },
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      const revision = ++this.loadRevision;
      this.loading = true;
      this.loadError = "";
      this.error = "";
      this.conflict = false;
      this.nodes = [];
      this.links = [];
      this.title = "";
      this.goal = "";
      try {
        this.course = await getCourse(this.$route.params.id);
        if (!this.course) throw new Error("课程不存在，请返回课程列表。");
        if (state.mode !== "account" || !this.course._remote) return;
        const graph = await loadCourseGraph(this.course.id, { force: true });
        if (this._isDestroyed || revision !== this.loadRevision) return;
        this.title = graph.title;
        this.goal = graph.goal;
        this.revision = graph.revision;
        this.nodes = graph.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          description: node.description,
          x: node.x,
          y: node.y,
          taskId: node.taskId || null,
        }));
        this.links = graph.links.map((link) => ({ ...link }));
        await this.refreshTasks();
      } catch (error) {
        if (revision === this.loadRevision && error.name !== "AbortError")
          this.loadError = error.message;
      } finally {
        if (!this._isDestroyed && revision === this.loadRevision)
          this.loading = false;
      }
    },
    async refreshTasks() {
      this.taskError = "";
      try {
        await loadTasks(true);
        const available = new Set(this.availableTasks.map((task) => task.id));
        this.nodes.forEach((node) => {
          if (node.taskId && !available.has(node.taskId)) node.taskId = null;
        });
      } catch (error) {
        this.taskError = "任务列表读取失败，可先不关联任务。";
      }
    },
    addNode() {
      const i = this.nodes.length;
      if (i >= 50) return;
      this.nodes.push({
        id: uid(),
        label: "",
        description: "",
        taskId: null,
        x: 70 + (i % 5) * 150,
        y: Math.min(250, 70 + Math.floor(i / 5) * 80),
      });
    },
    removeNode(id) {
      this.nodes = this.nodes.filter((node) => node.id !== id);
      this.links = this.links.filter(
        (link) => link.source !== id && link.target !== id,
      );
      if (this.source === id) this.source = "";
      if (this.target === id) this.target = "";
    },
    label(id) {
      return this.nodes.find((node) => node.id === id)?.label || "未命名知识点";
    },
    addLink() {
      this.error = "";
      if (this.source === this.target) {
        this.error = "一个知识点不能连接自身。";
        return;
      }
      if (
        this.links.some(
          (link) => link.source === this.source && link.target === this.target,
        )
      ) {
        this.error = "这条连接已经存在。";
        return;
      }
      this.links.push({ source: this.source, target: this.target });
    },
    arrange() {
      const columns = Math.min(6, Math.ceil(Math.sqrt(this.nodes.length * 2))),
        rows = Math.ceil(this.nodes.length / columns);
      this.nodes.forEach((node, i) => {
        node.x = Math.round(
          70 + (columns <= 1 ? 0 : ((i % columns) * 620) / (columns - 1)),
        );
        node.y = Math.round(
          60 + (rows <= 1 ? 60 : (Math.floor(i / columns) * 170) / (rows - 1)),
        );
      });
    },
    async save() {
      if (this.saving) return;
      this.error = "";
      this.conflict = false;
      if (!this.title.trim() || this.nodes.some((node) => !node.label.trim())) {
        this.error = "请填写星图标题和每个知识点的名称。";
        return;
      }
      this.saving = true;
      try {
        await saveCourseGraph(this.course.id, {
          title: this.title.trim(),
          goal: this.goal.trim(),
          revision: this.revision,
          nodes: this.nodes.map((node) => ({
            ...node,
            label: node.label.trim(),
            description: node.description.trim(),
          })),
          links: this.links,
        });
        notify("本课程知识星图已保存");
        await this.$router.replace({
          path: "/app/knowledge",
          query: { course: this.course.id },
        });
      } catch (error) {
        this.conflict = error.status === 409;
        this.error =
          error.details?.[0]?.message || error.message || "保存失败，请重试。";
      } finally {
        this.saving = false;
      }
    },
    async sync() {
      this.saving = true;
      try {
        const course = await syncLocalCourse(this.course);
        await this.$router.replace(
          "/app/courses/" + course.id + "/knowledge/edit",
        );
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";
/* 本课程编辑器的表单与预览布局；全局 input/button 等工具样式沿用项目原定义。 */
.graph-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.graph-editor-form {
  padding: 24px;
  fieldset {
    border: 0;
    min-width: 0;
    margin: 0;
    padding: 0;
  }
  .input {
    width: 100%;
  }
  select {
    color: @text;
    background: @surface;
  }
  .full-width {
    margin-top: 18px;
  }
}
.editor-section-heading,
.node-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.editor-section-heading {
  margin: 28px 0 16px;
  h2 {
    margin: 0;
    font-size: 19px;
  }
  small {
    font-size: 12px;
    color: @muted;
  }
}
.node-editor {
  background: @surface-raised;
  border: 1px solid @border;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 14px;
}
.node-editor-heading {
  color: @cyan;
}
.node-position {
  color: @muted;
  font-size: 12px;
  margin-top: 16px;
  summary {
    cursor: pointer;
  }
  .form-grid {
    margin-top: 12px;
  }
}
.edge-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  label {
    color: @muted;
    font-size: 13px;
  }
  select {
    margin-top: 8px;
  }
  .button {
    grid-column: 1 / -1;
  }
}
.edge-list {
  padding: 0;
  list-style: none;
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid @border;
    font-size: 13px;
  }
}
.editor-preview {
  position: sticky;
  top: 18px;
  padding: 24px;
  h2 {
    margin-top: 18px;
    overflow-wrap: anywhere;
  }
  p {
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
}
.editor-preview-empty {
  display: grid;
  place-content: center;
  text-align: center;
  min-height: 240px;
  color: @muted;
  .app-icon {
    margin: 0 auto;
    color: @cyan;
  }
}
.node-preview-detail {
  border-left: 2px solid @amber;
  padding-left: 16px;
  margin-bottom: 28px;
  strong {
    color: @amber;
  }
  p {
    color: @muted;
    font-size: 13px;
  }
  .badge {
    white-space: normal;
  }
}
.editor-status {
  padding: 35px;
}
@media (max-width: 1050px) {
  .graph-editor-layout {
    grid-template-columns: 1fr;
  }
  .editor-preview {
    position: static;
  }
}
@media (max-width: 480px) {
  .graph-editor-form,
  .editor-preview {
    padding: 16px;
  }
  .node-editor {
    padding: 12px;
  }
  .graph-editor-heading {
    gap: 20px;
    align-items: stretch;
  }
  .edge-inputs {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
