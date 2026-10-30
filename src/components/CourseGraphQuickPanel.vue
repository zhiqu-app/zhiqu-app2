<template>
  <div>
    <section class="panel quick-graph">
      <div class="panel-heading">
        <h2>课程知识点</h2>
        <router-link :to="'/app/courses/' + course.id + '/knowledge/edit'" class="text-button">完整编辑</router-link>
      </div>
      <p v-if="error" class="error-message" role="alert">
        {{ error }} <button class="text-button" @click="load">重新读取</button>
      </p>
      <KnowledgeGraph v-if="graph && graph.nodes.length" :title="course.name + '知识点关系'" :nodes="graph.nodes"
        :edges="graph.edges" />
      <p v-else-if="!loading" class="muted">
        还没有知识点，可先添加一项，再逐步连接。
      </p>
      <div class="button-row">
        <button class="button secondary" @click="
          nodeOpen = true;
        saveError = '';
        ">
          快速添加知识点
        </button>
        <button class="button secondary" :disabled="!graph || graph.nodes.length < 2" @click="
          edgeOpen = true;
        saveError = '';
        ">
          连接知识点
        </button>
      </div>
    </section>
    <AppModal v-if="nodeOpen" title="快速添加知识点" @close="close">
      <form @submit.prevent="saveNode">
        <label class="field-label" for="quick-node-label">知识点名称</label>
        <input id="quick-node-label" v-model.trim="node.label" class="input" required maxlength="80" />
        <label class="field-label" for="quick-node-description">知识点说明</label>
        <textarea id="quick-node-description" v-model="node.description" class="input" rows="3" maxlength="5000" />
        <p class="muted small">
          保存后立即加入当前课程，位置和任务关联可在完整编辑中调整。
        </p>
        <p v-if="saveError" class="error-message" role="alert">
          {{ saveError }}
        </p>
        <button class="button primary" :disabled="saving">保存知识点</button>
      </form>
    </AppModal>
    <AppModal v-if="edgeOpen" title="连接课程知识点" @close="close">
      <form @submit.prevent="saveEdge">
        <label class="field-label" for="quick-edge-source">先学习</label>
        <select id="quick-edge-source" v-model="edge.source" class="input" required>
          <option value="">选择知识点</option>
          <option v-for="n in graph.nodes" :key="n.id" :value="n.id">
            {{ n.label }}
          </option>
        </select>
        <label class="field-label" for="quick-edge-target">再学习</label>
        <select id="quick-edge-target" v-model="edge.target" class="input" required>
          <option value="">选择知识点</option>
          <option v-for="n in graph.nodes" :key="n.id" :value="n.id">
            {{ n.label }}
          </option>
        </select>
        <p v-if="saveError" class="error-message" role="alert">
          {{ saveError }}
        </p>
        <button class="button primary" :disabled="saving">保存连接</button>
      </form>
    </AppModal>
  </div>
</template>
<script>
import KnowledgeGraph from "./KnowledgeGraph.vue";
import AppModal from "./AppModal.vue";
import {
  loadGraphPreview,
  addGraphNode,
  addGraphEdge,
} from "../services/platform";
export default {
  name: "CourseGraphQuickPanel",
  components: { KnowledgeGraph, AppModal },
  props: { course: { type: Object, required: true } },
  data: () => ({
    graph: null,
    loading: true,
    error: "",
    nodeOpen: false,
    edgeOpen: false,
    saving: false,
    saveError: "",
    node: { label: "", description: "" },
    edge: { source: "", target: "" },
  }),
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.graph = await loadGraphPreview(this.course.id);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    close() {
      if (!this.saving) {
        this.nodeOpen = false;
        this.edgeOpen = false;
      }
    },
    async saveNode() {
      if (this.saving) return;
      this.saving = true;
      this.saveError = "";
      try {
        const i = this.graph?.nodes.length || 0;
        await addGraphNode(this.course.id, {
          ...this.node,
          x: 70 + (i % 5) * 150,
          y: Math.min(250, 70 + Math.floor(i / 5) * 80),
        });
        this.nodeOpen = false;
        this.node = { label: "", description: "" };
        await this.load();
      } catch (error) {
        this.saveError = error.details?.[0]?.message || error.message;
      } finally {
        this.saving = false;
      }
    },
    async saveEdge() {
      if (this.saving) return;
      this.saving = true;
      this.saveError = "";
      try {
        await addGraphEdge(this.course.id, this.edge);
        this.edgeOpen = false;
        this.edge = { source: "", target: "" };
        await this.load();
      } catch (error) {
        this.saveError = error.details?.[0]?.message || error.message;
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

.quick-graph {
  padding: 24px;
  margin-bottom: 18px;
}

.quick-graph .button-row {
  margin-top: 18px;
}

.quick-graph form>.button {
  margin-top: 20px;
}

@media (max-width: 480px) {
  .quick-graph {
    padding: 18px;
  }
}
</style>
