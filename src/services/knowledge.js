import { request, getToken } from './api'
import { state, persist } from '../store'

let pending = null

function accountScope() {
  return state.mode === 'account' ? `${state.account.id}:${getToken()}` : ''
}

function assertCurrent(scope) {
  if (!scope || scope !== accountScope()) {
    throw new DOMException('账号已经切换，请重新加载。', 'AbortError')
  }
}

// 拒绝损坏的响应，防止请求失败或格式错误时误显示为“尚未配置”。
function validGraph(graph) {
  if (graph === null) return null
  const nodes = graph?.nodes
  const edges = graph?.edges
  if (!graph?.courseId || !graph?.title || graph?.course?.id !== graph.courseId || !Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error('星图数据格式不完整，请重新加载。')
  }
  const ids = new Set()
  for (const node of nodes) {
    if (!node.id || typeof node.label !== 'string' || !Number.isFinite(node.x) || !Number.isFinite(node.y) || ids.has(node.id)) {
      throw new Error('星图节点数据无效，请重新加载。')
    }
    ids.add(node.id)
  }
  if (edges.some(edge => !Array.isArray(edge) || edge.length !== 2 || edge.some(i => !Number.isInteger(i) || i < 0 || i >= nodes.length))) {
    throw new Error('星图连线数据无效，请重新加载。')
  }
  return graph
}

// 将当前路线对应的真实课程放入现有课程选择器；其余课程/资料功能仍沿用原实现。
function applyGraph(graph) {
  state.knowledgeGraph = graph
  if (graph) {
    const index = state.courses.findIndex(course => course.id === graph.course.id)
    if (index === -1) state.courses.push(graph.course)
    else state.courses.splice(index, 1, graph.course)
    persist()
  }
  state.knowledgeStatus = 'ready'
  state.knowledgeError = ''
}

export function getGraphOptions() {
  return request('/knowledge/options')
}

// 同一账号的并发路由共用一次加载；切换账号后的旧响应不再写入共享状态。
export function loadCurrentGraph({ force = false } = {}) {
  const scope = accountScope()
  if (!scope) return Promise.reject(new Error('请先登录后配置星图。'))
  if (pending?.scope === scope) return pending.promise
  if (!force && state.knowledgeStatus === 'ready') return Promise.resolve(state.knowledgeGraph)

  state.knowledgeStatus = 'loading'
  state.knowledgeError = ''
  const operation = { scope }
  operation.promise = request('/knowledge/current')
    .then(result => {
      assertCurrent(scope)
      const graph = validGraph(result)
      applyGraph(graph)
      return graph
    })
    .catch(error => {
      if (scope === accountScope()) {
        state.knowledgeGraph = null
        state.knowledgeStatus = 'error'
        state.knowledgeError = error.message || '星图加载失败，请重试。'
      }
      throw error
    })
    .finally(() => {
      if (pending === operation) pending = null
    })
  pending = operation
  return operation.promise
}

export async function configureGraph(body) {
  const scope = accountScope()
  assertCurrent(scope)
  const result = await request('/knowledge/configure', { method: 'POST', body })
  assertCurrent(scope)
  const graph = validGraph(result)
  if (!graph) throw new Error('保存后没有返回星图，请重试。')
  applyGraph(graph)
  return graph
}
