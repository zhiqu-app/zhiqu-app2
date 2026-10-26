import { request, getToken } from "./api";
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

function mergeRemote(remote, local) {
  const ids = new Set(remote.map((item) => item.id));
  return [
    ...remote.map((item) => ({ ...item, _remote: true })),
    ...local
      .filter((item) => !ids.has(item.id) && !item._remote)
      .map((item) => ({ ...item, _remote: false })),
  ];
}

async function loadList(type, force) {
  if (state.mode !== "account") return state[type];
  const scope = accountScope(),
    key = `${scope}:${type}`;
  if (!force && state[type + "Loaded"]) return state[type];
  if (pending.has(key)) return pending.get(key);
  const operation = pages("/" + type)
    .then((items) => {
      assertScope(scope);
      state[type] = mergeRemote(items, state[type]);
      state[type + "Loaded"] = true;
      persist();
      return state[type];
    })
    .finally(() => {
      if (pending.get(key) === operation) pending.delete(key);
    });
  pending.set(key, operation);
  return operation;
}
export const loadCourses = (force = false) => loadList("courses", force);
export const loadTasks = (force = false) => loadList("tasks", force);

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

// 旧版本本机课程由用户显式同步；保留本机资料并重映射课程引用，不假称资料已上传。
export async function syncLocalCourse(course) {
  const saved = await createCourse(course);
  state.courses = state.courses.filter((item) => item.id !== course.id);
  state.materials.forEach((item) => {
    if (item.courseId === course.id) item.courseId = saved.id;
  });
  for (const task of state.tasks) {
    if (task.target === "/app/courses/" + course.id)
      task.target = "/app/courses/" + saved.id;
    else if (task.target?.includes("course=" + course.id)) {
      const target = new URL(task.target, window.location.origin);
      if (target.searchParams.get("course") === course.id)
        target.searchParams.set("course", saved.id);
      task.target = target.pathname + target.search;
    }
  }
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
  if (state.mode !== "account" || !course._remote)
    return state.materials.filter((item) => item.courseId === course.id);
  const scope = accountScope();
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
  if (!item._remote) return item;
  const scope = accountScope();
  const detail = await request("/materials/" + encodeURIComponent(item.id));
  assertScope(scope);
  Object.assign(item, detail);
  if (item.type === "PDF") {
    const blob = await request(
      "/materials/" + encodeURIComponent(item.id) + "/file?inline=true",
      { responseType: "blob" },
    );
    assertScope(scope);
    if (item.url) URL.revokeObjectURL(item.url);
    item.url = URL.createObjectURL(blob);
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
  const body = {
    title: form.title,
    description: form.description || "",
    minutes: form.minutes,
    date: form.date || "",
    done: Boolean(form.done),
    target: form.target || "/app/practice",
  };
  const existing = state.tasks.find((item) => item.id === form.id);
  const remote = existing?._remote;
  const result = await request(
    remote ? "/tasks/" + encodeURIComponent(form.id) : "/tasks",
    { method: remote ? "PATCH" : "POST", body },
  );
  assertScope(scope);
  state.tasks = [
    ...state.tasks.filter((item) => item.id !== form.id),
    { ...result, _remote: true },
  ];
  persist();
  return result;
}

export async function removeTask(task) {
  const scope = accountScope();
  if (task._remote)
    await request("/tasks/" + encodeURIComponent(task.id), {
      method: "DELETE",
    });
  assertScope(scope);
  state.tasks = state.tasks.filter((item) => item.id !== task.id);
  persist();
}
