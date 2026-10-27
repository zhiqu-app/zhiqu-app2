// 仅保存接口地址和短期会话令牌；SMTP 授权码、数据库密码只放后端 .env。
import {
  request,
  getToken,
  setToken,
  clearToken,
  onUnauthorized,
} from "./http";
export { request, getToken, clearToken, onUnauthorized };
async function authenticate(path, body) {
  const result = await request(path, { method: "POST", body });
  if (!result.accessToken || !result.user?.id)
    throw new Error("账号响应不完整，请重试。");
  setToken(result.accessToken);
  return result;
}

export const api = {
  onlineDemo: () => authenticate("/auth/demo", {}),
  sendEmailCode: (email) => request("/auth/email-code", { method: "POST", body: { email } }),
  register: (body) => authenticate("/auth/register", body),
  login: (body) => authenticate("/auth/login", body),
  me: () => request("/auth/me"),
  saveProfile: (body) => request("/profile", { method: "PATCH", body }),
  logout: async () => {
    try {
      if (getToken()) await request("/auth/logout", { method: "POST" });
    } finally {
      clearToken();
    }
  },
};
