// Axios 请求层：统一 baseURL、超时、鉴权头和错误结构。
import axios from 'axios'
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')
const TOKEN_KEY = 'zhixu-api-token'
const TIMEOUT = 20000
let unauthorized = () => {}
export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || ''
export const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)
export function onUnauthorized(handler) {
  unauthorized = handler
}
export const http = axios.create({
  baseURL: BASE,
  timeout: TIMEOUT,
  headers: { Accept: 'application/json' },
  validateStatus: () => true
})
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data !== undefined) config.headers['Content-Type'] = 'application/json'
  return config
})
function retryAfterOf(headers) {
  const raw = typeof headers?.get === 'function' ? headers.get('retry-after') : headers?.['retry-after']
  return Number(raw) || 0
}
function appError(data, status, headers) {
  const error = new Error(data?.error?.message || '请求失败，请稍后重试。')
  error.status = status
  error.details = data?.error?.details || []
  error.retryAfter = retryAfterOf(headers)
  return error
}
export async function request(path, { method = 'GET', body, signal } = {}) {
  try {
    const response = await http.request({ url: path, method, data: body, signal })
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401) {
        clearToken()
        unauthorized()
      }
      throw appError(response.data, response.status, response.headers)
    }
    return response.status === 204 ? null : response.data
  } catch (error) {
    if (error.status) throw error
    if (axios.isCancel(error)) throw new DOMException('Aborted', 'AbortError')
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('请求超时，请检查网络或稍后重试。')
    }
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_BAD_RESPONSE') {
      throw new Error('无法连接服务，请检查后端地址和跨域配置。')
    }
    throw error
  }
}
