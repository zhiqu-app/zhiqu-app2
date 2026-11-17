<template>
  <div v-if="course">
    <header class="page-heading">
      <div>
        <router-link class="back-link" to="/app/courses">← 我的课程</router-link>
        <h1>{{ course.name }}</h1>
        <p>{{ course.chapter }}</p>
      </div>
      <div class="button-row">
        <router-link v-if="course._remote && state.mode === 'account'" :to="'/app/courses/' + course.id + '/questions'"
          class="button secondary">配置题库</router-link>
        <router-link v-if="state.mode === 'account' && course._remote"
          :to="'/app/courses/' + course.id + '/knowledge/edit'" class="button secondary">配置知识星图</router-link>
        <router-link :to="{ path: '/app/studio', query: { course: course.id } }" class="button primary">
          <AppIcon name="graph" :size="18" />进入研习室
        </router-link>
      </div>
    </header>
    <section v-if="course._remote && !course.archived && !loading && !loadError"
      class="panel course-start" :class="{ 'course-start-ready': animateFirstUpload }" aria-label="课程起步">
      <div>
        <span class="course-start-step">{{ hasReadyMaterial ? "03 / 03" : "02 / 03" }} · 课程起步</span>
        <h2>{{ hasReadyMaterial ? "结合资料提问" : materials.length ? "导入可检索的资料" : "导入第一份资料" }}</h2>
        <p>{{ hasReadyMaterial
          ? "带着一个具体问题，让研习室从这门课的资料中找线索。"
          : "选一份 PDF、TXT 或 Markdown，给这门课添一份可查阅的讲义。" }}</p>
      </div>
      <router-link v-if="hasReadyMaterial" :to="{ name: 'studio', query: { course: course.id } }"
        class="button primary">用这门课提问 <AppIcon name="arrow" :size="17" /></router-link>
      <button v-else type="button" class="button primary" data-guide-target="material" :disabled="uploading" @click="$refs.upload.click()">
        <AppIcon name="upload" :size="17" />{{ uploading ? "正在导入…" : "选择课程资料" }}
      </button>
    </section>
    <p v-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <div class="content-with-aside">
      <section>
        <div class="panel course-summary">
          <img :src="asset(course.cover)" alt="" />
          <div>
            <span class="badge">{{
              course.archived ? "已归档" : "进行中"
            }}</span>
            <h2>{{ course.name }}</h2>
            <p class="muted">{{ course.description }}</p>
            <div class="progress-track">
              <i :style="{ width: course.progress + '%' }" />
            </div>
            <span class="small muted">{{ course.progress }}% ·
              {{ course._remote ? "按已完成课时统计" : "本机学习进度" }}</span>
          </div>
        </div>
        <CourseGraphQuickPanel v-if="course._remote && state.mode === 'account'" :course="course" />
        <div class="panel materials-panel">
          <div class="panel-heading">
            <h2>
              课程资料 <span class="muted">{{ materials.length }}</span>
            </h2>
            <label class="button primary small-button upload-label"
              :data-guide-target="hasReadyMaterial || course.archived || loading || loadError ? 'material' : null">
              <AppIcon name="upload" :size="18" />导入资料<input ref="upload" type="file" accept=".txt,.md,.pdf" multiple
                :disabled="uploading" @change="upload" />
            </label>
          </div>
          <p class="muted small">
            {{
              course._remote
                ? "支持 TXT、Markdown 与 PDF，导入后保存到你的课程。扫描 PDF 暂不支持 OCR。"
                : "本机课程资料保存在此浏览器；PDF 仅在本次会话预览。"
            }}
          </p>
          <p class="sr-only" role="status">{{ uploadAnnouncement }}</p>
          <label class="search-field material-search">
            <AppIcon name="search" :size="18" /><input v-model="search" aria-label="搜索当前课程资料" placeholder="搜索当前课程资料" />
          </label>
          <transition-group name="material-item" tag="div" :css="allowMotion">
            <div v-for="row in materialRows" :key="row.key" class="material-row"
              :class="{ 'is-uploading': row.phase === 'uploading', 'is-finished': row.recent && row.material && allowMotion }">
              <span class="file-icon" :class="{ pdf: row.type === 'PDF' }">{{ row.type.length <= 3 ? row.type : "文件" }}</span>
              <button v-if="row.material" class="material-name" @click="openPreview(row.material)">
                <strong>{{ row.name }}</strong>
                <small>{{ row.material.size }} · {{ row.material.created }}
                  {{ row.material.temporary ? " · 关闭网页后需重新导入" : "" }}
                  {{ state.mode === "account" && !row.material._remote ? " · 仅在本机" : "" }}
                </small>
              </button>
              <span v-else class="material-name upload-file-name">
                <strong>{{ row.name }}</strong>
                <small v-if="row.error" class="upload-error">{{ row.error }}</small>
              </span>
              <span class="badge upload-status" :class="{ amber: row.phase === 'failed' || row.material?.parseStatus === 'no_text' }">
                {{ row.material ? materialStatus(row.material) : uploadStatus(row.phase) }}
              </span>
              <button v-if="row.material" class="icon-button" :aria-label="'删除' + row.name" @click="deleteTarget = row.material">
                <AppIcon name="trash" :size="18" />
              </button>
              <button v-else-if="row.phase === 'failed'" class="icon-button" :aria-label="'关闭' + row.name + '的失败提示'"
                @click="dismissUpload(row.key)"><AppIcon name="close" :size="16" /></button>
              <span v-else class="upload-row-spacer" aria-hidden="true" />
            </div>
          </transition-group>
          <div v-if="!materialRows.length" class="empty-state">
            <AppIcon name="file" :size="36" />
            <h3>{{ search ? "没有匹配的资料" : "从第一份讲义开始" }}</h3>
            <p>把课堂资料放在这里，让学习从有据可查开始。</p>
          </div>
        </div>
      </section>
      <aside class="right-rail">
        <section class="panel upload-card">
          <AppIcon name="upload" :size="36" />
          <h2>让知识有处安放</h2>
          <p>
            选择电脑中的课程资料，按课程归档。单个文本限 500 KB，PDF 限 20 MB。
          </p>
          <label class="button secondary upload-label">选择文件<input type="file" accept=".txt,.md,.pdf" multiple
              :disabled="uploading" @change="upload" /></label>
        </section>
        <section class="panel">
          <h2>下一步，从这里开始</h2>
          <router-link class="action-row" :to="{ path: '/app/studio', query: { course: course.id } }">
            <AppIcon name="graph" />阅读与提问
            <AppIcon name="chevron" :size="16" />
          </router-link><router-link class="action-row" :to="{ path: '/app/knowledge', query: { course: course.id } }">
            <AppIcon name="book" />查看知识路线
            <AppIcon name="chevron" :size="16" />
          </router-link><router-link v-if="course._remote" class="action-row"
            :to="'/app/courses/' + course.id + '/knowledge/edit'">
            <AppIcon name="edit" />配置知识星图
            <AppIcon name="chevron" :size="16" />
          </router-link><router-link class="action-row" to="/app/practice">
            <AppIcon name="edit" />练习巩固
            <AppIcon name="chevron" :size="16" />
          </router-link>
        </section>
      </aside>
    </div>
    <AppModal v-if="preview" :title="preview.name" @close="preview = null"><iframe v-if="preview.url" :src="preview.url" title="PDF 资料预览" class="pdf-preview" />
      <pre v-else class="text-preview">{{ preview.text }}</pre>
    </AppModal>
    <AppModal v-if="deleteTarget" title="删除课程资料？" @close="deleteTarget = null">
      <p>
        将删除「{{deleteTarget.name}}」。资料将无法继续用于本地检索，已有引用可能失效。
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="deleteTarget = null">取消</button>
        <button class="button danger" @click="remove">确认删除</button>
      </div>
    </AppModal>
  </div>
  <div v-else class="empty-state">
    <h1>{{ loading ? "正在读取课程…" : loadError || "这门课程不存在" }}</h1>
    <button v-if="loadError" class="text-button" @click="load">重新加载</button>
    <router-link class="button primary" to="/app/courses">返回我的课程</router-link>
  </div>
</template>
<script>
import { motionAllowed } from "../utils/motion";
import { recordGuideAction } from "../services/workspace-guide";
import AppModal from "../components/AppModal.vue";
import CourseGraphQuickPanel from "../components/CourseGraphQuickPanel.vue";
import { state, uid, notify } from "../store";
import { asset } from "../utils/assets";
import {
  getCourse,
  loadMaterials,
  uploadMaterial,
  previewMaterial,
  deleteMaterial,
} from "../services/courses";
export default {
  name: "CourseDetail",
  components: { AppModal, CourseGraphQuickPanel },
  data: () => ({
    state,
    search: "",
    preview: null,
    deleteTarget: null,
    loading: false,
    loadError: "",
    uploading: false,
    uploadEntries: [],
    uploadAnnouncement: "",
    firstUploadCourse: null,
  }),
  computed: {
    allowMotion() {
      return motionAllowed();
    },
    course() {
      return state.courses.find((c) => c.id === this.$route.params.id);
    },
    materials() {
      return state.materials.filter(
        (m) => m.courseId === this.$route.params.id,
      );
    },
    hasReadyMaterial() {
      return this.materials.some((item) => item.parseStatus === "ready");
    },
    animateFirstUpload() {
      return this.hasReadyMaterial && this.firstUploadCourse === this.$route.params.id && this.allowMotion;
    },
    materialRows() {
      const keyword = this.search.toLowerCase();
      const listed = this.materials.filter((item) => item.name.toLowerCase().includes(keyword));
      const byId = new Map(listed.map((material) => [material.id, material]));
      const rows = [];
      for (const entry of this.uploadEntries) {
        if (!entry.materialId) rows.push(entry);
        else if (byId.has(entry.materialId)) {
          rows.push({ ...entry, recent: true, material: byId.get(entry.materialId) });
          byId.delete(entry.materialId);
        }
      }
      for (const material of byId.values()) {
        // 上传服务会先更新全局列表，这里等同一文件的占位行接管后再展示。
        if (!this.uploading || this.beforeUpload?.has(material.id))
          rows.push({ key: material.id, name: material.name, type: material.type, material });
      }
      return rows;
    },
  },
  methods: {
    asset,
    materialStatus(material) {
      if (material.parseStatus === "no_text") return "未提取到文字";
      if (material.parseStatus === "ready") return "可用于问答";
      return "可预览";
    },
    uploadStatus(phase) {
      return { queued: "等待导入", uploading: "正在导入", failed: "导入失败" }[phase];
    },
    dismissUpload(key) {
      this.uploadEntries = this.uploadEntries.filter((entry) => entry.key !== key);
    },
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        const course = await getCourse(this.$route.params.id);
        if (course) await loadMaterials(course);
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },
    async openPreview(material) {
      try {
        this.preview = await previewMaterial(material);
      } catch (error) {
        notify(error.message);
      }
    },
    async upload(event) {
      const files = Array.from(event.target.files || []);
      const courseId = this.$route.params.id;
      event.target.value = "";
      if (this.uploading || !files.length) return;
      const isFirstReady = !this.hasReadyMaterial;
      const entries = files.map((file) => ({ key: "upload:" + uid(), name: file.name,
        type: file.name.split(".").pop().toUpperCase(), phase: "queued", materialId: "", error: "" }));
      this.beforeUpload = new Set(this.materials.map((item) => item.id));
      this.uploadEntries = [...entries, ...this.uploadEntries];
      this.uploading = true;
      this.uploadAnnouncement = "正在导入 " + entries.length + " 份资料。";
      let added = 0;
      try {
        for (const [index, file] of files.entries()) {
          const row = entries[index];
          const pdf = row.type === "PDF";
          if (!["PDF", "TXT", "MD"].includes(row.type)) {
            row.phase = "failed";
            row.error = "仅支持 TXT、Markdown 与 PDF。";
            continue;
          }
          if (file.size > (pdf ? 20 * 1024 * 1024 : 500 * 1024)) {
            row.phase = "failed";
            row.error = "文件超出大小限制。";
            continue;
          }
          row.phase = "uploading";
          try {
            const material = await uploadMaterial(courseId, file);
            row.materialId = material.id;
            row.phase = "saved";
            added++;
            if (material.parseStatus === "ready") {
              recordGuideAction("material", courseId);
              if (isFirstReady) this.firstUploadCourse = courseId;
            }
          } catch (error) {
            row.phase = "failed";
            row.error = error.message || "读取文件失败，请重新导入。";
          }
        }
      } finally {
        this.uploading = false;
        this.beforeUpload = null;
      }
      const failed = files.length - added;
      this.uploadAnnouncement = "已导入 " + added + " 份资料" + (failed ? "，" + failed + " 份导入失败。" : "。");
      notify(this.uploadAnnouncement);
    },
    async remove() {
      const m = this.deleteTarget;
      try {
        await deleteMaterial(m);
        this.uploadEntries = this.uploadEntries.filter((entry) => entry.materialId !== m.id);
        this.deleteTarget = null;
        notify("资料已删除");
      } catch (error) {
        notify(error.message);
      }
    },
  },
  created() {
    this.load();
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

.course-start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 22px;
  border-left: 2px solid @cyan;

  h2 { margin: 5px 0; font-size: 17px; }
  p { margin: 0; color: #a5bfd1; }
}

.course-start-step {
  color: @cyan;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.course-start-ready {
  animation: course-ready 520ms ease-out;
}

@keyframes course-ready {
  from { background-color: #164257; }
}

/* 本组件的布局、状态、动效与响应式样式。 */

.back-link {
  color: #79abc9;
  font-size: 12px;
  display: inline-block;
  margin-bottom: 7px;
}

.course-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 18px;

  >img {
    width: 190px;
    height: 150px;
    object-fit: cover;
    border-radius: 5px;
  }

  >div {
    flex: 1;
  }

  h2 {
    margin: 8px 0;
  }

  p {
    font-size: 13px;
  }

  .progress-track {
    margin-bottom: 8px;
  }
}

.upload-label {
  cursor: pointer;

  input {
    display: none;
  }
}

.material-search {
  margin: 18px 0 4px;
}

.materials-panel .material-row {
  strong {
    font-size: 14px;
  }

  small {
    font-size: 12px;
  }
}

.material-row {
  .material-name { min-width: 0; }
  .upload-file-name strong { overflow-wrap: anywhere; }
  .upload-error { color: #ffb2ba; white-space: normal; line-height: 1.45; }
  .upload-status { flex-shrink: 0; }
  .upload-row-spacer { width: 40px; flex-shrink: 0; }
  &.is-uploading { box-shadow: inset 2px 0 #43b9df; }
  &.is-finished { animation: material-arrived .42s ease-out both; }
}
.material-item-enter-active, .material-item-leave-active { transition: opacity .18s ease, transform .18s ease; }
.material-item-enter, .material-item-leave-to { opacity: 0; transform: translateY(4px); }
@keyframes material-arrived {
  from { background-color: #174058; }
  to { background-color: transparent; }
}

.upload-card {
  text-align: center;

  >.app-icon {
    color: #4bb7ed;
    margin: 20px 0;
  }

  h2 {
    font-size: 18px;
  }

  p {
    color: #87adca;
    font-size: 12px;
  }

  .button {
    margin-bottom: 15px;
  }
}

.pdf-preview {
  width: 100%;
  height: 65dvh;
  border: 0;
  margin-top: 20px;
}

.text-preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #c9dfef;
  font-family: inherit;
  font-size: 15px;
  margin-top: 24px;
}

@media (max-width: 767px) {
  .course-summary {
    gap: 14px;

    >img {
      width: 95px;
      height: 115px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      font-size: 12px;
    }
  }

  .materials-panel .material-row {
    gap: 10px;

    strong {
      font-size: 12px;
    }

    small {
      font-size: 10px;
    }

    .upload-status {
      max-width: 82px;
      text-align: center;
      white-space: normal;
    }
  }
}
</style>
