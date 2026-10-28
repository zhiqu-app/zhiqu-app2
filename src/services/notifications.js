import Vue from "vue";
import { request, getToken, http } from "./http";
import { accountScope, loadTasks } from "./courses";

export const notificationState = Vue.observable({
  items: [],
  total: 0,
  unreadCount: 0,
  loading: false,
  error: "",
  connection: "offline",
  live: true,
});
let owner = "",
  generation = 0,
  socket,
  reconnectTimer,
  heartbeat,
  authTimer,
  refreshTimer,
  controller;
let retries = 0,
  lastMessage = 0,
  requestVersion = 0;

function current(scope, version) {
  return (
    scope &&
    owner === scope &&
    accountScope() === scope &&
    generation === version
  );
}
function clearTimers() {
  clearTimeout(reconnectTimer);
  clearTimeout(authTimer);
  clearTimeout(refreshTimer);
  clearInterval(heartbeat);
}

/** 清除连接、未完成请求和旧账号记录，避免切换账号后回流数据。 */
export function stopNotifications() {
  generation++;
  requestVersion++;
  owner = "";
  clearTimers();
  controller?.abort();
  const previous = socket;
  socket = null;
  if (previous) {
    previous.onclose =
      previous.onmessage =
      previous.onopen =
      previous.onerror =
        null;
    previous.close();
  }
  window.removeEventListener("online", online);
  document.removeEventListener("visibilitychange", visibility);
  Object.assign(notificationState, {
    items: [],
    total: 0,
    unreadCount: 0,
    loading: false,
    error: "",
    connection: "offline",
  });
}

/** REST 是权威记录；WebSocket 只通知变更，重连后重新读取数据库。 */
export async function refreshNotifications(append = false) {
  const scope = owner,
    version = generation;
  if (!current(scope, version)) return;
  const requestId = ++requestVersion;
  controller?.abort();
  controller = new AbortController();
  notificationState.loading = true;
  notificationState.error = "";
  try {
    const offset = append ? notificationState.items.length : 0;
    const result = await request(
      "/notifications?" + new URLSearchParams({ limit: 50, offset }),
      { signal: controller.signal },
    );
    if (!current(scope, version) || requestId !== requestVersion) return;
    if (!Array.isArray(result.items))
      throw new Error("提醒记录格式不完整，请重新加载。");
    const values = append
      ? [...notificationState.items, ...result.items]
      : result.items;
    notificationState.items = [
      ...new Map(values.map((item) => [item.id, item])).values(),
    ];
    notificationState.total = result.total;
    notificationState.unreadCount = result.unreadCount;
  } catch (error) {
    if (
      current(scope, version) &&
      requestId === requestVersion &&
      error.name !== "AbortError"
    )
      notificationState.error = error.message || "提醒读取失败，请重试。";
  } finally {
    if (current(scope, version) && requestId === requestVersion)
      notificationState.loading = false;
  }
}

export async function readNotification(id) {
  const scope = owner,
    version = generation;
  if (!current(scope, version)) return;
  try {
    await request("/notifications/" + encodeURIComponent(id), {
      method: "PATCH",
      body: { read: true },
    });
    if (current(scope, version)) await refreshNotifications();
  } catch (error) {
    if (current(scope, version)) notificationState.error = error.message;
  }
}
export async function readAllNotifications() {
  const scope = owner,
    version = generation;
  if (!current(scope, version)) return;
  try {
    await request("/notifications/read-all", { method: "POST" });
    if (current(scope, version)) await refreshNotifications();
  } catch (error) {
    if (current(scope, version)) notificationState.error = error.message;
  }
}

function online() {
  if (!owner) return;
  refreshNotifications();
  if (notificationState.live && (!socket || socket.readyState > 1)) {
    clearTimeout(reconnectTimer);
    connect();
  }
}
function visibility() {
  if (!document.hidden && owner) refreshNotifications();
}

function connect() {
  const scope = owner,
    version = generation;
  if (!current(scope, version) || !notificationState.live) return;
  const url = new URL(
    http.defaults.baseURL.replace(/\/$/, "") + "/notifications/ws",
    window.location.href,
  );
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  notificationState.connection = retries ? "reconnecting" : "connecting";
  try {
    socket = new WebSocket(url.href);
  } catch (_) {
    scheduleReconnect(scope, version);
    return;
  }
  const active = socket;
  authTimer = setTimeout(() => {
    if (socket === active) active.close();
  }, 8000);
  active.onopen = () => {
    if (!current(scope, version)) return active.close();
    // 浏览器 WebSocket 不支持 Authorization 头；令牌放在首条消息，避免出现在 URL 日志。
    active.send(JSON.stringify({ type: "authenticate", token: getToken() }));
  };
  active.onmessage = (event) => {
    if (!current(scope, version) || socket !== active) return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (_) {
      return;
    }
    lastMessage = Date.now();
    if (message.type === "ready") {
      clearTimeout(authTimer);
      retries = 0;
      notificationState.connection = "connected";
      refreshNotifications();
      loadTasks(true).catch(() => {});
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (!current(scope, version) || active.readyState !== WebSocket.OPEN)
          return;
        if (Date.now() - lastMessage > 65000) return active.close();
        active.send(JSON.stringify({ type: "ping" }));
      }, 20000);
    } else if (message.type === "notifications.changed") {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!current(scope, version)) return;
        refreshNotifications();
        loadTasks(true).catch(() => {});
      }, 100);
    }
  };
  active.onerror = () => {
    if (current(scope, version)) notificationState.connection = "reconnecting";
  };
  active.onclose = (event) => {
    if (!current(scope, version) || socket !== active) return;
    clearTimeout(authTimer);
    clearInterval(heartbeat);
    socket = null;
    if (event.code === 1008 || event.code === 4401 || event.code === 4403) {
      notificationState.connection = "unavailable";
      notificationState.error =
        "实时提醒连接未通过验证，请重新登录或检查服务配置。";
      return;
    }
    scheduleReconnect(scope, version);
  };
}
function scheduleReconnect(scope, version) {
  if (!current(scope, version) || !notificationState.live) return;
  notificationState.connection = "reconnecting";
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(
    connect,
    Math.min(30000, 1000 * 2 ** Math.min(retries++, 5)),
  );
}

export function startNotifications(live = true) {
  stopNotifications();
  notificationState.live = live;
  owner = accountScope();
  if (!owner || !getToken()) {
    owner = "";
    return;
  }
  window.addEventListener("online", online);
  document.addEventListener("visibilitychange", visibility);
  refreshNotifications();
  if (live) connect();
  else notificationState.connection = "muted";
}
