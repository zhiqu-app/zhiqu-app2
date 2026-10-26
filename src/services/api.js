// 仅保存接口地址和短期会话令牌；SMTP 授权码、数据库密码只放后端 .env。
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')
const TOKEN_KEY = 'zhixu-api-token'
let unauthorized = () => {}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || ''
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)
export function onUnauthorized(handler) { unauthorized = handler }

export async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(BASE + path, {
      method, headers, signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) { clearToken(); unauthorized() }
      const error = new Error(data.error?.message || '请求失败，请稍后重试。')
      error.status = response.status
      error.details = data.error?.details || []
      error.retryAfter = Number(response.headers.get('Retry-After')) || 0
      throw error
    }
    return response.status === 204 ? null : await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请检查邮箱或稍后重试。')
    if (error instanceof TypeError) throw new Error('无法连接服务，请检查后端地址和跨域配置。')
    throw error
  } finally { clearTimeout(timeout) }
}

async function authenticate(path, body) {
  const result = await request(path, { method: 'POST', body })
  if (!result.accessToken || !result.user?.id) throw new Error('账号响应不完整，请重试。')
  sessionStorage.setItem(TOKEN_KEY, result.accessToken)
  return result
}

export const api = {
  sendEmailCode: email => request('/auth/email-code', { method: 'POST', body: { email } }),
  register: body => authenticate('/auth/register', body),
  login: body => authenticate('/auth/login', body),
  me: () => request('/auth/me'),
  saveProfile: body => request('/profile', { method: 'PATCH', body }),
  logout: async () => {
    try { if (getToken()) await request('/auth/logout', { method: 'POST' }) }
    finally { clearToken() }
  }
}