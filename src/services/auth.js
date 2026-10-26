import { api, getToken, clearToken, onUnauthorized } from './api'
import { state, activateAccount, clearAccount, notify, enterDemo as enterLocalDemo } from '../store'

let restoring = null
onUnauthorized(() => {
  if (state.mode === 'account') clearAccount()
})
// 用户注册
export async function registerAccount(body) {
  const result = await api.register(body)
  activateAccount(result.user)
  return result.user
}

export async function loginAccount(email, password) {
  const result = await api.login({ email: email.trim(), password })
  activateAccount(result.user)
  return result.user
}

export async function restoreSession() {
  if (!getToken()) {
    if (state.mode === 'account') clearAccount()
    return null
  }
  if (!restoring) {
    const token = getToken()
    restoring = api
      .me()
      .then((user) => {
        if (getToken() !== token) return null
        activateAccount(user)
        return user
      })
      .catch((error) => {
        if (error.status === 401) return null
        throw error
      })
      .finally(() => {
        restoring = null
      })
  }
  return restoring
}

export async function logoutAccount() {
  try {
    await api.logout()
  } finally {
    clearAccount()
  }
}

export async function enterDemo() {
  // 本地体验不要求邮件/数据库服务，不能携带上一个真实账号的令牌。
  try {
    if (getToken()) await api.logout()
  } catch (_) {
    notify('已切换本地体验，服务端会话撤销未确认。')
  } finally {
    clearToken()
    clearAccount()
    enterLocalDemo()
  }
}
