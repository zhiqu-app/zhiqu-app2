<template>
  <div class="group-graph-shell">
    <nav ref="directory" class="group-directory" aria-label="大知识点目录">
      <button v-for="group in normalized.groups" :key="group.id" type="button" class="group-choice"
        :aria-current="currentGroupId === group.id ? 'true' : null" @click="chooseGroup(group.id)">
        <span>{{ group.title }}</span><small>{{ count(group.id) }} / 6 个小知识点</small>
      </button>
    </nav>
    <section v-if="currentGroup" class="group-stage" :aria-label="currentGroup.title">
      <div class="group-stage-heading">
        <div>
          <span class="group-parent-label">大知识点</span>
          <h3>{{ currentGroup.title }}</h3>
        </div>
        <span class="muted small">包含 {{ slice.nodes.length }} 个小知识点</span>
      </div>
      <div v-if="slice.nodes.length" class="group-canvas" aria-label="大知识点星图">
        <KnowledgeGraph :key="currentGroupId" :title="currentGroup.title" :nodes="slice.nodes" :edges="slice.edges"
          :selected="localSelected" @select="chooseNode" />
      </div>
      <p v-else class="group-empty muted">
        这个大知识点还没有内容，可在配置课程星图中添加小知识点。
      </p>
      <p v-if="currentGroup.legacy" class="muted small group-legacy">
        旧知识点已按每组最多 6 点临时整理，可在配置中为大知识点改名。
      </p>
      <div v-if="relations.length" class="group-relations">
        <p class="muted small">这个知识点还关联了其他大知识点</p>
        <button v-for="node in relations" :key="node.direction + ':' + node.id" type="button" class="group-relation"
          @click="jumpTo(node)">
          <span>{{
            node.direction === "prerequisite" ? "前置知识" : "后续知识"
          }}</span>
          <strong>{{ node.label }}</strong><small>{{ node.groupTitle }}</small>
          <AppIcon name="arrow" :size="16" />
        </button>
      </div>
    </section>
    <p v-else class="muted group-empty">
      先创建大知识点，再向里面添加小知识点。
    </p>
  </div>
</template>
<script>
import KnowledgeGraph from "./KnowledgeGraph.vue";
import {
  normalizeGroups,
  groupSlice,
  relatedAcrossGroups,
} from "../utils/knowledgeGroups";
export default {
  name: "GroupedKnowledgeGraph",
  components: { KnowledgeGraph },
  props: {
    graph: { type: Object, required: true },
    selected: { type: String, default: "" },
    group: { type: String, default: "" },
  },
  data: () => ({ currentGroupId: "", localSelected: "" }),
  computed: {
    normalized() {
      return normalizeGroups(this.graph);
    },
    currentGroup() {
      return this.normalized.groups.find((c) => c.id === this.currentGroupId);
    },
    slice() {
      return groupSlice(this.normalized, this.currentGroupId);
    },
    relations() {
      return relatedAcrossGroups(this.normalized, this.localSelected);
    },
  },
  watch: {
    normalized: {
      immediate: true,
      handler(graph) {
        const selected = graph.nodes.find((n) => n.id === this.selected);
        const id = graph.groups.some((c) => c.id === this.group)
          ? this.group
          : graph.groups.some((c) => c.id === this.currentGroupId)
            ? this.currentGroupId
            : selected?.groupId || graph.groups[0]?.id || "";
        if (id !== this.currentGroupId) this.chooseGroup(id);
        else if (
          !graph.nodes.some(
            (n) => n.id === this.localSelected && n.groupId === id,
          )
        )
          this.chooseNode(graph.nodes.find((n) => n.groupId === id) || null);
      },
    },
    group(id) {
      if (id && id !== this.currentGroupId) this.chooseGroup(id);
    },
    selected(id) {
      const node = this.normalized.nodes.find((n) => n.id === id);
      if (node && node.id !== this.localSelected) this.jumpTo(node);
    },
  },
  methods: {
    count(id) {
      return this.normalized.nodes.filter((n) => n.groupId === id).length;
    },
    chooseGroup(id) {
      this.currentGroupId = id;
      this.$emit("group", id);
      const node =
        this.normalized.nodes.find(
          (n) => n.groupId === id && n.id === this.selected,
        ) ||
        this.normalized.nodes.find((n) => n.groupId === id) ||
        null;
      this.chooseNode(node);
      this.revealGroup();
    },
    chooseNode(node) {
      this.localSelected = node?.id || "";
      this.$emit("select", node);
    },
    jumpTo(node) {
      this.currentGroupId = node.groupId;
      this.$emit("group", node.groupId);
      this.chooseNode(node);
      this.revealGroup();
    },
    revealGroup() {
      this.$nextTick(() => {
        const directory = this.$refs.directory;
        const button = directory?.querySelector('[aria-current="true"]');
        if (!button) return;
        const bounds = directory.getBoundingClientRect();
        const selected = button.getBoundingClientRect();
        if (selected.left < bounds.left)
          directory.scrollLeft -= bounds.left - selected.left;
        else if (selected.right > bounds.right)
          directory.scrollLeft += selected.right - bounds.right;
      });
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

/* 大知识点切换限制每次绘制范围；窄屏只让画布内部滚动，不撑开整页。 */
.group-graph-shell {
  min-width: 0;
  margin: 24px 0;
}

.group-directory {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 0 12px;
  scrollbar-width: thin;
  scrollbar-color: @border transparent;
}

.group-choice {
  flex: 0 0 155px;
  min-width: 0;
  padding: 13px 15px;
  border: 1px solid @border;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  color: @muted;

  span {
    display: block;
    overflow-wrap: anywhere;
    line-height: 1.5;
  }

  small {
    display: block;
    margin-top: 7px;
    font-size: 11px;
    color: @muted;
  }

  &[aria-current="true"] {
    border-color: @cyan;
    color: @text;
    background: fade(@cyan, 7%);
  }

  &:focus-visible {
    outline: 2px solid @amber;
    outline-offset: 2px;
  }
}

.group-stage {
  min-width: 0;
  border-top: 1px solid @border;
  padding-top: 20px;
}

.group-stage-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  >span {
    flex-shrink: 0;
  }
}

.group-parent-label {
  display: block;
  color: @cyan;
  font-size: 11px;
  margin-bottom: 8px;
}

.group-canvas {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 24px 0 0;
  scrollbar-width: thin;
  scrollbar-color: @border transparent;

  >.knowledge-graph {
    width: 100%;
    min-width: 0;
  }

  &:focus-visible {
    outline: 1px solid @cyan;
    outline-offset: 3px;
  }
}

.group-empty {
  padding: 35px 0;
  line-height: 1.8;
}

.group-legacy {
  margin: 8px 0;
  line-height: 1.8;
}

.group-relations {
  border-top: 1px solid @border;
  padding-top: 14px;
}

.group-relation {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 12px 0;
  background: transparent;
  border: 0;
  color: @text;

  >span {
    color: @amber;
    font-size: 12px;
    flex-shrink: 0;
  }

  strong {
    font-size: 13px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  small {
    color: @muted;
    margin-left: auto;
    overflow-wrap: anywhere;
  }

  .app-icon {
    color: @cyan;
    flex-shrink: 0;
  }
}

@media (max-width: 767px) {
  .group-choice {
    flex-basis: 148px;
  }

  .group-stage-heading {
    align-items: flex-start;
  }

  .group-relation {
    flex-wrap: wrap;

    small {
      margin-left: 0;
    }
  }
}
</style>
