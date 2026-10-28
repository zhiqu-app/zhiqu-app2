import { request, getToken } from "./api";
import Vue from "vue";
import { state, persist } from "../store";

const pending = new Map();
export const accountScope = () =>
  state.mode === "account" ? `${state.account.id}:${getToken()}` : "";
export function assertScope(scope) {
  if (!scope || accountScope() !== scope)
    throw new DOMException("账号已切换，请重新加载。", "AbortError");
}

async function pages(path) {
  const items = [];
  let offset = 0;
  do {
    const page = await request(
      path + (path.includes("?") ? "&" : "?") + `limit=100&offset=${offset}`,
    );
    if (!Array.isArray(page.items))
      throw new Error("列表数据格式不正确，请重试。");
    items.push(...page.items);
    offset += page.items.length;
    if (!page.items.length || offset >= page.total) return items;
  } while (offset < 10000);
  throw new Error("列表数据过多，请先整理后重试。");
}

function mergeRemote(remote) {
  return remote.map((item) => ({ ...item, _remote: true }));
}

async function loadList(type, force) {
  const scope = accountScope(),
    key = `${scope}:${type}`;
  if (!force && state[type + "Loaded"]) return state[type];
  const active = pending.get(key);
  if (active) {
    if (!force) return active.operation;
    // A change signal can arrive after the active GET took its snapshot. Read
    // again after it settles; coalesce signals received during this generation.
    if (!active.refresh)
      active.refresh = active.operation
        .catch(() => undefined)
        .then(() => {
          assertScope(scope);
          return loadList(type, true);
        });
    return active.refresh;
  }
  const entry = { operation: null, refresh: null };
  const operation = pages("/" + type)
    .then((items) => {
      assertScope(scope);
      state[type] = mergeRemote(items, state[type]);
      state[type + "Loaded"] = true;
      persist();
      return state[type];
    })
    .finally(() => {
      if (pending.get(key) === entry) pending.delete(key);
    });
  entry.operation = operation;
  pending.set(key, entry);
  return operation;
}
export const loadCourses = (force = false) => loadList("courses", force);
export const loadTasks = (force = false) => loadList("tasks", force);

// Keep all task consumers reactive when an attempt or detail request returns progress.
export function mergeTask(task) {
  if (!task?.id) throw new Error("计划响应不完整，请重新加载。");
  const index = state.tasks.findIndex((item) => item.id === task.id);
  const saved = {
    ...(index >= 0 ? state.tasks[index] : {}),
    ...task,
    _remote: true,
  };
  if (index < 0) state.tasks.push(saved);
  else Vue.set(state.tasks, index, saved);
  persist();
  return saved;
}

export async function getTask(id) {
  const scope = accountScope();
  assertScope(scope);
  const task = await request("/tasks/" + encodeURIComponent(id));
  assertScope(scope);
  return mergeTask(task);
}

export async function toggleSubtask(taskId, subtaskId, done) {
  const scope = accountScope();
  assertScope(scope);
  const task = await request(
    "/tasks/" +
      encodeURIComponent(taskId) +
      "/subtasks/" +
      encodeURIComponent(subtaskId),
    { method: "PATCH", body: { done } },
  );
  assertScope(scope);
  return mergeTask(task);
}

export async function createCourse(form) {
  const scope = accountScope();
  assertScope(scope);
  const course = await request("/courses", {
    method: "POST",
    body: {
      name: form.name,
      teacher: form.teacher || "未设置",
      description: form.description || "",
    },
  });
  assertScope(scope);
  const saved = { ...course, _remote: true };
  state.courses.push(saved);
  persist();
  return saved;
}

export async function archiveCourse(course, archived) {
  const scope = accountScope();
  const result = await request("/courses/" + encodeURIComponent(course.id), {
    method: "PATCH",
    body: { archived },
  });
  assertScope(scope);
  Object.assign(course, result);
  persist();
}

export async function getCourse(id) {
  await loadCourses();
  const cached = state.courses.find((item) => item.id === id);
  if (cached) return cached;
  if (state.mode !== "account") return null;
  const scope = accountScope();
  const course = await request("/courses/" + encodeURIComponent(id));
  assertScope(scope);
  const result = { ...course, _remote: true };
  state.courses.push(result);
  return result;
}

export async function loadMaterials(course) {
  const scope = accountScope();
  assertScope(scope);
  const remote = await pages(
    "/materials?courseId=" + encodeURIComponent(course.id),
  );
  assertScope(scope);
  const local = state.materials.filter((item) => item.courseId === course.id);
  const merged = mergeRemote(
    remote.map((item) => ({
      ...local.find((old) => old.id === item.id),
      ...item,
    })),
    local,
  );
  state.materials = [
    ...state.materials.filter((item) => item.courseId !== course.id),
    ...merged,
  ];
  persist();
  return merged;
}

export async function uploadMaterial(courseId, file) {
  const scope = accountScope();
  const body = new FormData();
  body.append("file", file);
  const item = await request(
    "/courses/" + encodeURIComponent(courseId) + "/materials",
    { method: "POST", body },
  );
  assertScope(scope);
  const result = { ...item, _remote: true };
  state.materials.push(result);
  persist();
  return result;
}

export async function previewMaterial(item) {
  const scope = accountScope();
  const detail = await request("/materials/" + encodeURIComponent(item.id));
  assertScope(scope);
  Object.entries(detail).forEach(([key, value]) => Vue.set(item, key, value));
  if (item.type === "PDF") {
    const blob = await request(
      "/materials/" + encodeURIComponent(item.id) + "/file?inline=true",
      { responseType: "blob" },
    );
    assertScope(scope);
    if (item.url) URL.revokeObjectURL(item.url);
    Vue.set(item, "url", URL.createObjectURL(blob));
  }
  return item;
}

export async function deleteMaterial(item) {
  const scope = accountScope();
  await request("/materials/" + encodeURIComponent(item.id), {
    method: "DELETE",
  });
  assertScope(scope);
  state.materials = state.materials.filter((old) => old.id !== item.id);
  if (item.url) URL.revokeObjectURL(item.url);
  persist();
}

export async function saveTask(form) {
  const scope = accountScope();
  assertScope(scope);
  const kind = form.kind === "exercise" ? "exercise" : "custom";
  if (kind === "exercise" && (!form.courseId || !form.questionIds?.length))
    throw new Error("请选择课程和至少一道题目。");
  const existing = state.tasks.find((item) => item.id === form.id);
  const remote = existing?._remote;
  const body = {
    title: form.title,
    description: form.description || "",
    minutes: form.minutes,
    date: form.date || "",
    ...(kind === "custom"
      ? {
          subtasks: (form.subtasks || [{ title: form.title }]).map((item) => ({
            ...(remote && item.id ? { id: item.id } : {}),
            title: item.title,
          })),
        }
      : {}),
    ...(kind === "custom" ? { target: form.target || "/app/practice" } : {}),
    kind,
    courseId: kind === "exercise" ? form.courseId : null,
    questionIds: kind === "exercise" ? [...form.questionIds] : [],
    reminderAt: form.reminderAt || null,
  };
  const result = await request(
    remote ? "/tasks/" + encodeURIComponent(form.id) : "/tasks",
    { method: remote ? "PATCH" : "POST", body },
  );
  assertScope(scope);
  if (form.id && form.id !== result.id)
    state.tasks = state.tasks.filter((item) => item.id !== form.id);
  mergeTask(result);
  return result;
}

export async function removeTask(task) {
  const scope = accountScope();
  assertScope(scope);
  await request("/tasks/" + encodeURIComponent(task.id), {
    method: "DELETE",
  });
  assertScope(scope);
  state.tasks = state.tasks.filter((item) => item.id !== task.id);
  persist();
}
