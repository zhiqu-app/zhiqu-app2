import { api, getToken, clearToken, onUnauthorized } from "./api";
import { state, activateAccount, clearAccount, notify } from "../store";

let restoring = null;
onUnauthorized(() => {
  if (state.mode === "account") clearAccount();
});
// 用户注册
export async function registerAccount(body) {
  const result = await api.register(body);
  activateAccount(result.user);
  return result.user;
}

export async function loginAccount(email, password) {
  const result = await api.login({ email: email.trim(), password });
  activateAccount(result.user);
  return result.user;
}

export async function restoreSession() {
  if (!getToken()) {
    if (state.mode === "account") clearAccount();
    return null;
  }
  if (!restoring) {
    const token = getToken();
    restoring = api
      .me()
      .then((user) => {
        if (getToken() !== token) return null;
        activateAccount(user);
        return user;
      })
      .catch((error) => {
        if (error.status === 401) return null;
        throw error;
      })
      .finally(() => {
        restoring = null;
      });
  }
  return restoring;
}

export async function logoutAccount() {
  try {
    await api.logout();
  } finally {
    clearAccount();
  }
}

// 在线示例由后端创建独立账号与数据；没有本地体验回退。
export async function enterOnlineDemo() {
  if (getToken()) await logoutAccount();
  const result = await api.onlineDemo();
  activateAccount(result.user);
  return result.user;
}
