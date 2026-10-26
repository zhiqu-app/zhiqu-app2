<template>
  <div v-if="course">
    <header class="page-heading">
      <div>
        <router-link class="back-link" to="/app/courses"
          >← 我的课程</router-link
        >
        <h1>{{ course.name }}</h1>
        <p>{{ course.chapter }}</p>
      </div>
      <div class="button-row">
        <router-link
          v-if="state.mode === 'account' && course._remote"
          :to="'/app/courses/' + course.id + '/knowledge/edit'"
          class="button secondary"
          >配置知识星图</router-link
        >
        <button
          v-else-if="state.mode === 'account'"
          class="button secondary"
          :disabled="syncing"
          @click="syncCourse"
        >
          {{ syncing ? "正在同步…" : "同步课程并配置星图" }}
        </button>
        <router-link
          :to="{ path: '/app/studio', query: { course: course.id } }"
          class="button primary"
          ><AppIcon name="graph" :size="18" />进入研习室</router-link
        >
      </div>
    </header>
    <p v-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <p v-if="!course._remote && state.mode === 'account'" class="muted">
      这是旧版本的本机课程。同步后可保存星图，已有本机资料会保留；需要跨设备使用的资料请重新导入。
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
            <span class="small muted"
              >{{ course.progress }}% ·
              {{ course._remote ? "按已完成课时统计" : "本机学习进度" }}</span
            >
          </div>
        </div>
        <div class="panel materials-panel">
          <div class="panel-heading">
            <h2>
              课程资料 <span class="muted">{{ materials.length }}</span>
            </h2>
            <label class="button primary small-button upload-label"
              ><AppIcon name="upload" :size="18" />导入资料<input
                ref="upload"
                type="file"
                accept=".txt,.md,.pdf"
                multiple
                :disabled="uploading"
                @change="upload"
            /></label>
          </div>
          <p class="muted small">
            {{
              course._remote
                ? "支持 TXT、Markdown 与 PDF，导入后保存到你的课程。扫描 PDF 暂不支持 OCR。"
                : "本机课程资料保存在此浏览器；PDF 仅在本次会话预览。"
            }}
          </p>
          <p v-if="uploading" class="muted" role="status">
            正在导入资料，请稍候…
          </p>
          <label class="search-field material-search"
            ><AppIcon name="search" :size="18" /><input
              v-model="search"
              aria-label="搜索当前课程资料"
              placeholder="搜索当前课程资料"
          /></label>
          <div v-for="m in filtered" :key="m.id" class="material-row">
            <span class="file-icon" :class="{ pdf: m.type === 'PDF' }">{{
              m.type
            }}</span
            ><button class="material-name" @click="openPreview(m)">
              <strong>{{ m.name }}</strong
              ><small
                >{{ m.size }} · {{ m.created
                }}{{ m.temporary ? " · 关闭网页后需重新导入" : "" }}{{ state.mode === 'account' && !m._remote ? ' · 仅在本机' : '' }}</small
              ></button
            ><span class="badge">{{
              m.type === "PDF" ? "可预览" : "可检索"
            }}</span
            ><button
              class="icon-button"
              :aria-label="'删除' + m.name"
              @click="deleteTarget = m"
            >
              <AppIcon name="trash" :size="18" />
            </button>
          </div>
          <div v-if="!filtered.length" class="empty-state">
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
          <label class="button secondary upload-label"
            >选择文件<input
              type="file"
              accept=".txt,.md,.pdf"
              multiple
              @change="upload"
          /></label>
        </section>
        <section class="panel">
          <h2>下一步，从这里开始</h2>
          <router-link
            class="action-row"
            :to="{ path: '/app/studio', query: { course: course.id } }"
            ><AppIcon name="graph" />阅读与提问<AppIcon
              name="chevron"
              :size="16" /></router-link
          ><router-link
            class="action-row"
            :to="{ path: '/app/knowledge', query: { course: course.id } }"
            ><AppIcon name="book" />查看知识路线<AppIcon
              name="chevron"
              :size="16" /></router-link
          ><router-link
            v-if="course._remote"
            class="action-row"
            :to="'/app/courses/' + course.id + '/knowledge/edit'"
            ><AppIcon name="edit" />配置知识星图<AppIcon
              name="chevron"
              :size="16" /></router-link
          ><router-link class="action-row" to="/app/practice"
            ><AppIcon name="edit" />练习巩固<AppIcon name="chevron" :size="16"
          /></router-link>
        </section>
      </aside>
    </div>
    <AppModal v-if="preview" :title="preview.name" @close="preview = null"
      ><iframe
        v-if="preview.url"
        :src="preview.url"
        title="PDF 资料预览"
        class="pdf-preview"
      />
      <pre v-else class="text-preview">{{ preview.text }}</pre></AppModal
    ><AppModal
      v-if="deleteTarget"
      title="删除课程资料？"
      @close="deleteTarget = null"
      ><p>
        将删除「{{
          deleteTarget.name
        }}」。资料将无法继续用于本地检索，已有引用可能失效。
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="deleteTarget = null">
          取消</button
        ><button class="button danger" @click="remove">确认删除</button>
      </div></AppModal
    >
  </div>
  <div v-else class="empty-state">
    <h1>{{ loading ? "正在读取课程…" : loadError || "这门课程不存在" }}</h1>
    <button v-if="loadError" class="text-button" @click="load">重新加载</button>
    <router-link class="button primary" to="/app/courses"
      >返回我的课程</router-link
    >
  </div>
</template>
<script>
import AppModal from "../components/AppModal.vue";
import { state, persist, uid, notify } from "../store";
import { asset } from "../utils/assets";
import {
  getCourse,
  loadMaterials,
  uploadMaterial,
  previewMaterial,
  deleteMaterial,
  syncLocalCourse,
} from "../services/courses";
export default {
  name: "CourseDetail",
  components: { AppModal },
  data: () => ({
    state,
    search: "",
    preview: null,
    deleteTarget: null,
    loading: false,
    loadError: "",
    uploading: false,
    syncing: false,
  }),
  computed: {
    course() {
      return state.courses.find((c) => c.id === this.$route.params.id);
    },
    materials() {
      return state.materials.filter(
        (m) => m.courseId === this.$route.params.id,
      );
    },
    filtered() {
      return this.materials.filter((m) =>
        m.name.toLowerCase().includes(this.search.toLowerCase()),
      );
    },
  },
  methods: {
    asset,
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
    async syncCourse() {
      if (this.syncing) return;
      this.syncing = true;
      try {
        const course = await syncLocalCourse(this.course);
        await this.$router.replace(
          "/app/courses/" + course.id + "/knowledge/edit",
        );
      } catch (error) {
        notify(error.message);
      } finally {
        this.syncing = false;
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
      if (this.uploading) return;
      this.uploading = true;
      let added = 0;
      for (const file of files) {
        const ext = file.name.split(".").pop().toLowerCase();
        const pdf = ext === "pdf";
        if (!["pdf", "txt", "md"].includes(ext)) {
          notify("仅支持 TXT、Markdown 与 PDF 文件");
          continue;
        }
        if (file.size > (pdf ? 20 * 1024 * 1024 : 500 * 1024)) {
          notify(file.name + " 超出大小限制");
          continue;
        }
        try {
          if (this.course._remote && state.mode === "account") {
            await uploadMaterial(courseId, file);
            added++;
            continue;
          }
          const m = {
            id: uid(),
            courseId,
            name: file.name,
            type: pdf ? "PDF" : "TXT",
            size: (file.size / 1024).toFixed(1) + " KB",
            created: new Date().toLocaleDateString("zh-CN"),
            temporary: pdf,
          };
          if (pdf) m.url = URL.createObjectURL(file);
          else m.text = await file.text();
          state.materials.push(m);
          added++;
        } catch (error) {
          notify(error.message || "读取文件失败，请重试。");
        }
      }
      if (added) {
        persist();
        notify("已导入 " + added + " 份资料");
      }
      this.uploading = false;
    },
    async remove() {
      const m = this.deleteTarget;
      if (m._remote && state.mode === "account") {
        try {
          await deleteMaterial(m);
          this.deleteTarget = null;
          notify("资料已删除");
        } catch (error) {
          notify(error.message);
        }
        return;
      }
      if (m.url) URL.revokeObjectURL(m.url);
      state.materials = state.materials.filter((item) => item.id !== m.id);
      this.deleteTarget = null;
      persist();
      notify("资料已删除");
    },
  },
  created() {
    this.load();
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

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
  > img {
    width: 190px;
    height: 150px;
    object-fit: cover;
    border-radius: 5px;
  }
  > div {
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
.upload-card {
  text-align: center;
  > .app-icon {
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
    > img {
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
    .badge {
      display: none;
    }
  }
}
</style>
