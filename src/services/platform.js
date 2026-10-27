import Vue from "vue";
import { request } from "./api";
import { state, persist } from "../store";
import { accountScope, assertScope } from "./courses";

async function accountRequest(path, options) {
  const scope = accountScope();
  assertScope(scope);
  const result = await request(path, options);
  assertScope(scope);
  return result;
}
export const getHealth = () => request("/health");
export const getProfile = () => accountRequest("/profile");
export const exportAccountData = () => accountRequest("/data/export");
export const resetAccountData = () =>
  accountRequest("/data/reset", {
    method: "POST",
    body: { confirm: "RESET_MY_LEARNING_DATA", seedDemo: false },
  });
export const createSingleQuestion = (courseId, body) =>
  accountRequest("/courses/" + encodeURIComponent(courseId) + "/questions", {
    method: "POST",
    body,
  });
export const loadAttemptPage = (courseId, offset = 0) =>
  accountRequest(
    "/attempts?" +
      new URLSearchParams({
        limit: 20,
        offset,
        ...(courseId ? { courseId } : {}),
      }),
  );
export const askAccountAssistant = (body, signal) =>
  accountRequest("/assistant/ask", { method: "POST", body, signal });
export async function loadAssistantHistory(courseId) {
  const rows = [];
  let offset = 0;
  while (offset < 1000) {
    const page = await accountRequest(
      "/assistant/history?" +
        new URLSearchParams({ courseId, limit: 100, offset }),
    );
    if (!Array.isArray(page.items)) throw new Error("问答历史格式不完整");
    rows.push(...page.items);
    offset += page.items.length;
    if (!page.items.length || offset >= page.total) return rows.reverse();
  }
  return rows.reverse();
}
export const loadGraphPreview = (courseId) =>
  accountRequest("/knowledge?" + new URLSearchParams({ courseId }));
export async function addGraphNode(courseId, body) {
  const result = await accountRequest(
    "/courses/" + encodeURIComponent(courseId) + "/knowledge/nodes",
    { method: "POST", body },
  );
  Vue.delete(state.knowledgeGraphs, courseId);
  return result;
}
export async function addGraphEdge(courseId, body) {
  const result = await accountRequest(
    "/courses/" + encodeURIComponent(courseId) + "/knowledge/edges",
    { method: "POST", body },
  );
  Vue.delete(state.knowledgeGraphs, courseId);
  return result;
}
export async function deleteAccountCourse(course) {
  await accountRequest("/courses/" + encodeURIComponent(course.id), {
    method: "DELETE",
  });
  state.materials
    .filter((m) => m.courseId === course.id)
    .forEach((m) => {
      if (m.url) URL.revokeObjectURL(m.url);
    });
  state.courses = state.courses.filter((c) => c.id !== course.id);
  state.materials = state.materials.filter((m) => m.courseId !== course.id);
  state.attempts = state.attempts.filter((a) => a.courseId !== course.id);
  Vue.delete(state.knowledgeGraphs, course.id);
  if (state.knowledgeCourseId === course.id) {
    state.knowledgeCourseId = "";
    state.knowledgeGraph = null;
  }
  state.tasksLoaded = false;
  persist();
}

export function downloadJson(value, filename) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
