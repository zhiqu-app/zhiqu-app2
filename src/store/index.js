import Vue from "vue";
import {
  initialCourses,
  initialMaterials,
  initialTasks,
  questions,
} from "../data/demo";

const KEY = "zhixu-v2-state";
let storageKey = KEY;
let identity = "";
let saved = null;
try {
  saved = JSON.parse(localStorage.getItem(KEY));
} catch (_) {
  /* 使用默认数据 */
}
// 默认参数
const valid =
  saved &&
  saved.version === 1 &&
  Array.isArray(saved.courses) &&
  Array.isArray(saved.materials) &&
  Array.isArray(saved.tasks) &&
  Array.isArray(saved.attempts);

// 体验数据
const defaults = {
  name: "林同学",
  major: "计算机科学",
  grade: "大二",
  email: "",
  reducedMotion: false,
  reminders: true,
};

let session = false;

try {
  session = sessionStorage.getItem("zhixu-demo-session") === "yes";
} catch (_) {}
export const state = Vue.observable({
  courses: valid ? saved.courses : initialCourses.map((c) => ({ ...c })),
  materials: valid ? saved.materials : initialMaterials.map((m) => ({ ...m })),
  tasks: valid ? saved.tasks : initialTasks.map((t) => ({ ...t })),
  attempts: valid ? saved.attempts : [],
  settings: { ...defaults, ...(valid ? saved.settings : {}) },
  session,
  mode: session ? "demo" : "anonymous",
  account: null,
  // 仅保存在内存；刷新后从账号接口恢复，不能用浏览器标记代替数据库配置。
  knowledgeGraph: null,
  knowledgeGraphs: {},
  knowledgeCourseId: "",
  coursesLoaded: false,
  tasksLoaded: false,
  knowledgeStatus: "idle",
  knowledgeError: "",
  toast: "",
  storageError: false,
});
let toastTimer;
export function notify(message) {
  state.toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = "";
  }, 3600);
}
export function persist() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        courses: state.courses,
        // Blob URL 只在当前会话有效，远端 PDF 下次预览时重新读取。
        materials: state.materials
          .filter((m) => !m.temporary)
          .map(({ url, ...material }) => material),
        tasks: state.tasks,
        attempts: state.attempts,
        settings: state.settings,
      }),
    );
    state.storageError = false;
    return true;
  } catch (_) {
    state.storageError = true;
    notify("浏览器存储空间不足，本次修改暂未保存。");
    return false;
  }
}
export function enterDemo() {
  switchSpace(KEY, false);
  identity = "";
  state.account = null;
  state.mode = "demo";
  state.session = true;
  try {
    sessionStorage.setItem("zhixu-demo-session", "yes");
  } catch (_) {}
}
export function leaveDemo() {
  state.session = false;
  sessionStorage.removeItem("zhixu-demo-session");
  state.mode = "anonymous";
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function saveAttempt(questionId, choice, seconds) {
  const q = questions.find((q) => q.id === questionId);
  if (!q || choice < 0 || choice >= q.options.length) return;
  state.attempts.push({
    id: uid(),
    questionId,
    choice,
    correct: choice === q.answer,
    seconds,
    date: new Date().toISOString(),
  });
  persist();
}
export function resetData() {
  state.courses =
    state.mode === "account" ? [] : initialCourses.map((c) => ({ ...c }));
  state.materials.forEach((m) => {
    if (m.url) URL.revokeObjectURL(m.url);
  });
  state.materials =
    state.mode === "account" ? [] : initialMaterials.map((m) => ({ ...m }));
  state.tasks =
    state.mode === "account" ? [] : initialTasks.map((t) => ({ ...t }));
  state.attempts = [];
  persist();
}

// 真实账号只隔离本机业务缓存；课程等业务接口尚需逐页接入。
function switchSpace(key, empty, profile = {}) {
  state.knowledgeGraph = null;
  state.knowledgeGraphs = {};
  state.knowledgeCourseId = "";
  state.coursesLoaded = false;
  state.tasksLoaded = false;
  state.knowledgeStatus = "idle";
  state.knowledgeError = "";
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(key));
  } catch (_) {
    /* 使用空空间 */
  }
  const usable =
    cached &&
    cached.version === 1 &&
    ["courses", "materials", "tasks", "attempts"].every((name) =>
      Array.isArray(cached[name]),
    );
  state.materials.forEach((m) => {
    if (m.url) URL.revokeObjectURL(m.url);
  });
  storageKey = key;
  state.courses = usable
    ? cached.courses
    : empty
      ? []
      : initialCourses.map((c) => ({ ...c }));
  state.materials = usable
    ? cached.materials
    : empty
      ? []
      : initialMaterials.map((m) => ({ ...m }));
  state.tasks = usable
    ? cached.tasks
    : empty
      ? []
      : initialTasks.map((t) => ({ ...t }));
  state.attempts = usable ? cached.attempts : [];
  state.settings = {
    ...defaults,
    ...(usable ? cached.settings : {}),
    ...profile,
  };
  state.storageError = false;
  sessionStorage.removeItem("zhixu-practice-draft");
}

export function activateAccount(user) {
  if (identity !== user.id)
    switchSpace(`${KEY}:user:${user.id}`, true, user.profile);
  else Object.assign(state.settings, user.profile);
  identity = user.id;
  state.account = user;
  state.mode = "account";
  state.session = true;
  sessionStorage.removeItem("zhixu-demo-session");
}

export function clearAccount() {
  switchSpace(KEY, false);
  identity = "";
  state.account = null;
  state.mode = "anonymous";
  state.session = false;
  sessionStorage.removeItem("zhixu-demo-session");
}
