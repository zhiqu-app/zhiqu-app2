import { state } from "../store";
import { loadCourses, getCourse } from "../services/courses";
import { loadCourseGraph } from "../services/course-knowledge";

// 总览与知识路线共用课程选择及读取逻辑；没有星图是正常空状态，不阻止路由。
export default {
  data: () => ({
    state,
    activeCourseId: "",
    graphLoading: true,
    graphError: "",
    graphRequest: 0,
  }),
  computed: {
    currentCourse() {
      return (
        state.courses.find((course) => course.id === this.activeCourseId) ||
        null
      );
    },
    graph() {
      return state.mode === "account"
        ? state.knowledgeGraphs[this.activeCourseId] || null
        : null;
    },
    graphEditorPath() {
      return this.currentCourse?._remote
        ? "/app/courses/" + this.currentCourse.id + "/knowledge/edit"
        : this.currentCourse
          ? "/app/courses/" + this.currentCourse.id
          : "/app/courses";
    },
  },
  created() {
    this.prepareGraph();
  },
  watch: {
    "$route.query.course"(id) {
      if (id && id !== this.activeCourseId) {
        this.activeCourseId = id;
        this.readGraph(true);
      }
    },
  },
  methods: {
    async prepareGraph() {
      this.graphLoading = true;
      this.graphError = "";
      try {
        await loadCourses();
        const requested =
          typeof this.$route.query.course === "string"
            ? this.$route.query.course
            : "";
        if (
          requested &&
          !state.courses.some((course) => course.id === requested)
        )
          await getCourse(requested);
        this.activeCourseId =
          requested ||
          (state.courses.some((course) => course.id === state.knowledgeCourseId)
            ? state.knowledgeCourseId
            : state.courses.find((course) => !course.archived)?.id ||
              state.courses[0]?.id ||
              "");
        await this.readGraph(true);
      } catch (error) {
        this.graphError = error.message;
      } finally {
        this.graphLoading = false;
      }
    },
    async readGraph(force = false) {
      const revision = ++this.graphRequest;
      this.graphLoading = true;
      this.graphError = "";
      try {
        if (!this.currentCourse && this.activeCourseId)
          await getCourse(this.activeCourseId);
        if (state.mode === "account" && this.currentCourse?._remote)
          await loadCourseGraph(this.activeCourseId, { force });
      } catch (error) {
        if (revision === this.graphRequest && error.name !== "AbortError")
          this.graphError = error.message;
      } finally {
        if (!this._isDestroyed && revision === this.graphRequest)
          this.graphLoading = false;
      }
    },
    async changeCourse() {
      if (this.$route.name === "knowledge") {
        await this.$router.replace({
          path: "/app/knowledge",
          query: { course: this.activeCourseId },
        });
      }
      await this.readGraph(true);
    },
  },
};
