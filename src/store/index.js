import Vue from "vue";

const KEY = "zhixu-v2-state";
let storageKey = KEY;
let identity = "";
const defaults = {
  name: "",
  major: "",
  grade: "",
  email: "",
  reducedMotion: false,
  reminders: true,
};
function preferences(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))?.settings;
    return typeof value?.reducedMotion === "boolean"
      ? { reducedMotion: value.reducedMotion }
      : {};
  } catch (_) {
    return {};
  }
}

// 业务列表只保留后端响应的内存副本。旧浏览器课程和体验标记不再参与初始化。
export const state = Vue.observable({
  courses: [],
  materials: [],
  tasks: [],
  attempts: [],
  settings: { ...defaults, ...preferences(KEY) },
  session: false,
  mode: "anonymous",
  account: null,
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

// 本地仅缓存界面动效偏好，不存课程、资料、任务或作答。
export function persist() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        settings: { reducedMotion: state.settings.reducedMotion },
      }),
    );
    state.storageError = false;
    return true;
  } catch (_) {
    state.storageError = true;
    notify("浏览器暂时无法保存界面偏好，学习数据仍以服务器为准。");
    return false;
  }
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function resetData() {
  state.materials.forEach((material) => {
    if (material.url) URL.revokeObjectURL(material.url);
  });
  state.courses = [];
  state.materials = [];
  state.tasks = [];
  state.attempts = [];
  state.knowledgeGraph = null;
  state.knowledgeGraphs = {};
  state.knowledgeCourseId = "";
  state.coursesLoaded = false;
  state.tasksLoaded = false;
  state.knowledgeStatus = "idle";
  state.knowledgeError = "";
  try {
    const prefix =
      "zhixu-practice-draft:account:" + (state.account?.id || "") + ":";
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch (_) {}
}

function switchSpace(key, profile = {}) {
  resetData();
  storageKey = key;
  state.settings = { ...defaults, ...preferences(key), ...profile };
  state.storageError = false;
}
export function activateAccount(user) {
  if (identity !== user.id) switchSpace(`${KEY}:user:${user.id}`, user.profile);
  else Object.assign(state.settings, user.profile);
  identity = user.id;
  state.account = user;
  state.mode = "account";
  state.session = true;
  sessionStorage.removeItem("zhixu-demo-session");
}
export function clearAccount() {
  switchSpace(KEY);
  identity = "";
  state.account = null;
  state.mode = "anonymous";
  state.session = false;
  sessionStorage.removeItem("zhixu-demo-session");
}
