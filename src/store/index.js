import Vue from 'vue'
import { initialCourses, initialMaterials, initialTasks, questions } from '../data/demo'

const KEY = 'zhixu-v2-state'
let saved = null
try {
  saved = JSON.parse(localStorage.getItem(KEY))
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
  Array.isArray(saved.attempts)

// 体验数据
const defaults = {
  name: '林同学',
  major: '计算机科学',
  grade: '大二',
  email: '',
  reducedMotion: false,
  reminders: true
}

let session = false

try {
  session = sessionStorage.getItem('zhixu-demo-session') === 'yes'
} catch (_) {}
export const state = Vue.observable({
  courses: valid ? saved.courses : initialCourses.map((c) => ({ ...c })),
  materials: valid ? saved.materials : initialMaterials.map((m) => ({ ...m })),
  tasks: valid ? saved.tasks : initialTasks.map((t) => ({ ...t })),
  attempts: valid ? saved.attempts : [],
  settings: { ...defaults, ...(valid ? saved.settings : {}) },
  session,
  toast: '',
  storageError: false
})
let toastTimer
export function notify(message) {
  state.toast = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    state.toast = ''
  }, 3600)
}
export function persist() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        courses: state.courses,
        materials: state.materials.filter((m) => !m.temporary),
        tasks: state.tasks,
        attempts: state.attempts,
        settings: state.settings
      })
    )
    state.storageError = false
    return true
  } catch (_) {
    state.storageError = true
    notify('浏览器存储空间不足，本次修改暂未保存。')
    return false
  }
}
export function enterDemo() {
  state.session = true
  try {
    sessionStorage.setItem('zhixu-demo-session', 'yes')
  } catch (_) {}
}
export function leaveDemo() {
  state.session = false
  sessionStorage.removeItem('zhixu-demo-session')
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
export function saveAttempt(questionId, choice, seconds) {
  const q = questions.find((q) => q.id === questionId)
  if (!q || choice < 0 || choice >= q.options.length) return
  state.attempts.push({
    id: uid(),
    questionId,
    choice,
    correct: choice === q.answer,
    seconds,
    date: new Date().toISOString()
  })
  persist()
}
export function resetData() {
  state.courses = initialCourses.map((c) => ({ ...c }))
  state.materials.forEach((m) => {
    if (m.url) URL.revokeObjectURL(m.url)
  })
  state.materials = initialMaterials.map((m) => ({ ...m }))
  state.tasks = initialTasks.map((t) => ({ ...t }))
  state.attempts = []
  persist()
}
