<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>我的课程</h1>
        <p>把讲义、练习和复习放回各自的课程。</p>
      </div>
      <div class="button-row">
        <button class="button secondary" @click="importCourse">
          <AppIcon name="upload" :size="18" />导入资料
        </button>
        <button class="button primary" @click="showCreate = true">
          <AppIcon name="plus" />新建课程
        </button>
      </div>
    </header>
    <p v-if="loadError" class="error-message" role="alert">
      {{ loadError }}
      <button class="text-button" @click="load">重新加载</button>
    </p>
    <p v-if="loading" class="muted" role="status">正在读取课程…</p>
    <div class="content-with-aside">
      <section>
        <div class="filter-bar panel">
          <div class="tabs">
            <button
              v-for="f in filters"
              :key="f.key"
              :class="{ active: filter === f.key }"
              @click="filter = f.key"
            >
              {{ f.label
              }}<span v-if="f.key !== 'all'" class="count">{{
                count(f.key)
              }}</span>
            </button>
          </div>
          <label class="search-field">
            <AppIcon name="search" :size="18" /><input
              v-model="search"
              placeholder="搜索我的课程"
              aria-label="搜索我的课程"
            />
          </label>
        </div>
        <div class="course-list">
          <CourseCard
            v-for="(course, index) in filtered"
            :key="course.id"
            :course="course"
            :compact="index >= 2"
            :material-count="
              state.materials.filter((m) => m.courseId === course.id).length
            "
            @archive="toggleArchive"
            :deletable="state.mode === 'account' && course._remote"
            @delete="
              deleteTarget = $event;
              deleteError = '';
            "
          />
          <div
            v-if="!loading && !loadError && !filtered.length"
            class="panel empty-state"
          >
            <AppIcon name="book" :size="40" />
            <h2>没有找到课程</h2>
            <p>换一个关键词，或新建你的第一门课程。</p>
            <button class="button primary" @click="showCreate = true">
              新建课程
            </button>
          </div>
        </div>
      </section>
      <aside class="right-rail">
        <section class="panel">
          <div class="panel-heading">
            <h2>最近资料</h2>
            <AppIcon name="file" />
          </div>
          <router-link
            v-for="m in recent"
            :key="m.id"
            :to="'/app/courses/' + m.courseId"
            class="material-row"
            ><span class="file-icon">{{ m.type }}</span>
            <span>
              <strong>{{ m.name }}</strong>
              <small>{{ courseName(m.courseId) }} · {{ m.created }}</small>
            </span>
            <span class="badge">就绪</span>
          </router-link>
          <p v-if="!recent.length" class="muted">还没有课程资料</p>
        </section>
        <section class="panel tip-card">
          <AppIcon name="spark" :size="28" />
          <h2>学习小贴士</h2>
          <p>把每次学习的问题记下来。下一次复习，就从这些问题开始。</p>
          <span class="small muted">学习进度为课程示例数据</span>
          <div class="wave-decoration" />
        </section>
      </aside>
    </div>
    <AppModal v-if="showCreate" title="新建课程" @close="showCreate = false">
      <form @submit.prevent="create">
        <p v-if="createError" class="error-message" role="alert">
          {{ createError }}
        </p>
        <label class="field-label" for="course-name">课程名称</label>
        <input
          id="course-name"
          v-model.trim="form.name"
          class="input"
          required
          maxlength="30"
          placeholder="例如：计算机网络"
        />
        <label class="field-label" for="course-teacher">授课教师（选填）</label>
        <input
          id="course-teacher"
          v-model.trim="form.teacher"
          class="input"
          maxlength="20"
          placeholder="老师姓名"
        />
        <label class="field-label" for="course-description"
          >课程简介（选填）</label
        >
        <textarea
          id="course-description"
          v-model.trim="form.description"
          class="input"
          rows="3"
          maxlength="180"
        />
        <div class="modal-actions">
          <button
            class="button secondary"
            type="button"
            @click="showCreate = false"
          >
            取消
          </button>
          <button class="button primary" :disabled="busy || !form.name">
            {{ busy ? "正在创建…" : "创建课程" }}
          </button>
        </div>
      </form>
    </AppModal>
    <AppModal
      v-if="deleteTarget"
      :title="'删除课程：' + deleteTarget.name + '？'"
      @close="closeDelete"
      ><p>
        会删除这门课程的资料和 PDF
        原文件、题库、作答、星图和问答记录，其他课程不受影响。
      </p>
      <p v-if="deleteError" class="error-message" role="alert">
        {{ deleteError }}
      </p>
      <div class="modal-actions">
        <button
          class="button secondary"
          :disabled="deleting"
          @click="closeDelete"
        >
          取消</button
        ><button
          class="button danger"
          :disabled="deleting"
          @click="confirmDelete"
        >
          {{ deleting ? "正在删除…" : "确认删除课程" }}
        </button>
      </div></AppModal
    >
  </div>
</template>
<script>
import CourseCard from "../components/CourseCard.vue";
import AppModal from "../components/AppModal.vue";
import { state, persist, uid, notify } from "../store";
import { loadCourses, createCourse, archiveCourse } from "../services/courses";
import { deleteAccountCourse } from "../services/platform";
export default {
  name: "Courses",
  components: { CourseCard, AppModal },
  data() {
    return {
      state,
      search: this.$route.query.q || "",
      filter: "all",
      showCreate: false,
      deleteTarget: null,
      deleting: false,
      deleteError: "",
      loading: false,
      loadError: "",
      createError: "",
      busy: false,
      form: { name: "", teacher: "", description: "" },
      filters: [
        { key: "all", label: "全部课程" },
        { key: "active", label: "进行中" },
        { key: "archived", label: "已归档" },
      ],
    };
  },
  computed: {
    filtered() {
      return state.courses.filter(
        (c) =>
          (!this.search ||
            (c.name + c.description)
              .toLowerCase()
              .includes(this.search.toLowerCase())) &&
          (this.filter === "all" ||
            c.archived === (this.filter === "archived")),
      );
    },
    recent() {
      return state.materials.slice().reverse().slice(0, 5);
    },
  },
  watch: {
    "$route.query.q"(q) {
      this.search = q || "";
    },
  },
  methods: {
    closeDelete() {
      if (!this.deleting) this.deleteTarget = null;
    },
    async confirmDelete() {
      if (this.deleting || !this.deleteTarget) return;
      this.deleting = true;
      this.deleteError = "";
      try {
        await deleteAccountCourse(this.deleteTarget);
        this.deleteTarget = null;
        notify("课程及关联学习记录已删除");
      } catch (error) {
        this.deleteError = error.message;
      } finally {
        this.deleting = false;
      }
    },
    async load() {
      this.loading = true;
      this.loadError = "";
      try {
        await loadCourses(true);
      } catch (error) {
        this.loadError = error.message;
      } finally {
        this.loading = false;
      }
    },
    count(key) {
      return state.courses.filter((c) => c.archived === (key === "archived"))
        .length;
    },
    courseName(id) {
      return (state.courses.find((c) => c.id === id) || {}).name || "";
    },
    async toggleArchive(course) {
      if (state.mode === "account" && course._remote) {
        try {
          await archiveCourse(course, !course.archived);
        } catch (error) {
          notify(error.message);
          return;
        }
      } else {
        course.archived = !course.archived;
        persist();
      }
      notify(
        course.archived ? "课程已归档，可在已归档中恢复。" : "课程已恢复。",
      );
    },
    importCourse() {
      const course = state.courses.find((c) => !c.archived);
      if (course) this.$router.push("/app/courses/" + course.id + "?upload=1");
      else this.showCreate = true;
    },
    async create() {
      if (!this.form.name || this.busy) return;
      this.createError = "";
      if (state.mode === "account") {
        this.busy = true;
        try {
          const course = await createCourse(this.form);
          this.showCreate = false;
          notify("课程已创建，可以导入资料或配置知识星图。");
          await this.$router.push("/app/courses/" + course.id);
        } catch (error) {
          this.createError = error.message;
        } finally {
          this.busy = false;
        }
        return;
      }
      const id = uid();
      state.courses.push({
        id,
        name: this.form.name,
        teacher: this.form.teacher || "未设置",
        description:
          this.form.description || "从第一份课程资料开始，建立你的学习路径。",
        chapter: "开始整理你的课程知识",
        progress: 0,
        lessons: 0,
        cover: "structures",
        archived: false,
      });
      persist();
      this.showCreate = false;
      notify("课程已创建");
      this.$router.push("/app/courses/" + id);
    },
  },
  created() {
    this.load();
  },
};
</script>
