<template>
  <div class="studio-page">
    <header class="page-heading">
      <div>
        <h1>AI 研习室</h1>
        <p>基于课程资料阅读与提问，边学边问，加深理解。</p>
      </div>
      <select v-model="courseId" class="input course-select" aria-label="选择研习课程" @change="courseChanged">
        <option v-for="c in state.courses" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </header>
    <div class="mobile-study-tabs tabs">
        <button :class="{ active: tab === 'document' }" @click="tab = 'document'">
            课程资料
        </button>
        <button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">阅读答疑</button>
    </div>
    <div class="studio-layout">
      <section class="panel document-panel" :class="{ 'mobile-hidden': tab !== 'document' }">
        <div class="document-toolbar">
          <select v-model="materialId" aria-label="选择阅读资料">
            <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
            <option v-if="!materials.length" value="">暂无资料</option>
          </select>
          <span class="badge">{{ material && material.type === 'PDF' ? '本地预览' : '文字资料' }}</span>
        </div>
        <iframe v-if="material && material.url" :src="material.url" title="课程 PDF 预览" class="studio-pdf" />
        <article v-else-if="material" ref="document" class="document-paper"
            :class="{ 'source-highlight': highlighted }">
            <span class="document-kicker">知序 · 课程资料</span>
            <h2>{{ material.name.replace(/\.(txt|md)$/i, '') }}</h2>
            <div v-for="(paragraph, i) in paragraphs" :key="i" class="paper-paragraph"
                :class="{ definition: paragraph.startsWith('定义') || paragraph.startsWith('例') }">
                {{ paragraph }}
            </div>
            <div class="paper-footer">
                {{ material.sample ? '内置示例文字资料' : '本地导入资料' }} · 请结合原文核对
            </div>
        </article>
        <div v-else class="empty-state">
            <AppIcon name="file" :size="40" />
            <h2>还没有课程资料</h2>
            <p>先为当前课程导入一份 TXT、Markdown 或 PDF。</p>
            <router-link :to="'/app/courses/' + courseId" class="button primary">导入资料</router-link>
        </div>
      </section>
      <section class="panel chat-panel" :class="{ 'mobile-hidden': tab !== 'chat' }">
        <div class="panel-heading">
          <h2>课程答疑</h2>
          <span class="badge">本地检索演示</span>
        </div>
        <div ref="messages" class="chat-messages" aria-live="polite" aria-relevant="additions text">
          <div class="chat-intro">
            <AppIcon name="spark" :size="28" />
            <h3>让问题带你走近理解</h3>
            <p>当前使用关键词匹配课程文字，未连接大模型。引用来自实际展示的资料片段。</p>
            <button v-for="q in suggestions" :key="q" class="suggestion-button" :disabled="busy" @click="send(q)">
              {{ q }}
              <AppIcon name="arrow" :size="16" />
            </button>
          </div>
          <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
            <UserAvatar v-if="message.role === 'user'" :size="30" />
            <div v-else class="assistant-avatar">
              <AppIcon name="book" :size="20" />
            </div>
            <div class="message-body">
              <p>{{ message.text }}</p>
              <button v-for="(source, i) in message.sources" :key="i" class="source-chip" @click="locate(source)">
                <AppIcon name="file" :size="16" />
                {{ source.name }} · 原文片段
                <AppIcon name="chevron" :size="14" />
              </button>
            </div>
          </article>
          <div v-if="busy" class="muted small">正在显示资料检索结果…</div>
        </div>
        <div class="chat-compose">
          <p class="small muted">
            <AppIcon name="info" :size="14" />仅检索当前课程的文字资料；PDF 暂不参与检索。
          </p>
          <form @submit.prevent="send(question)">
            <textarea v-model="question" aria-label="向课程资料提问" placeholder="结合课程资料提问…" rows="2" maxlength="1000"
                @keydown.enter.exact.prevent="send(question)" />
                <button v-if="busy" class="button secondary" type="button" @click="stop">
                    停止
                </button>
                <button v-else class="send-button"
                :disabled="!question.trim() || !searchable.length" aria-label="发送问题">
                    <AppIcon name="send" />
                </button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
<script>
import UserAvatar from '../components/UserAvatar.vue'
import { state, uid, notify } from '../store'
import { askAssistant } from '../services/assistant'
export default {
  name: 'Studio',
  components: { UserAvatar },
  data() {
    const courseId = state.courses.some((c) => c.id === this.$route.query.course)
      ? this.$route.query.course
      : (state.courses[0] || {}).id
    return {
      state,
      courseId,
      materialId: '',
      question: '',
      messages: [],
      busy: false,
      tab: 'chat',
      highlighted: false,
      generation: 0
    }
  },
  computed: {
    materials() {
      return state.materials.filter((m) => m.courseId === this.courseId)
    },
    material() {
      return this.materials.find((m) => m.id === this.materialId)
    },
    searchable() {
      return this.materials.filter((m) => m.text)
    },
    paragraphs() {
      return this.material && this.material.text
        ? this.material.text.split(/\n+/).filter(Boolean)
        : []
    },
    suggestions() {
      if (state.mode === 'account') {
        const graph = state.knowledgeGraph
        return graph && graph.courseId === this.courseId
          ? graph.nodes.slice(0, 2).map(node => '如何理解' + node.label + '？')
          : ['这份资料有哪些核心概念？', '能用一个例子解释吗？']
      }
      return this.courseId === 'structures'
        ? ['二叉树是什么？', '中序遍历的顺序是什么？']
        : ['对角矩阵的特征值怎么求？', '特征向量满足什么条件？']
    }
  },
  mounted() {
    this.materialId = (this.materials[0] || {}).id || ''
  },
  beforeDestroy() {
    this.stop()
    clearTimeout(this.highlightTimer)
  },
  methods: {
    courseChanged() {
      this.stop()
      this.materialId = (this.materials[0] || {}).id || ''
      this.messages = []
    },
    async send(text) {
      if (!text.trim() || this.busy) return
      if (!this.searchable.length) {
        notify('请先导入可检索的 TXT 或 Markdown 资料。')
        return
      }
      const question = text.trim()
      this.question = ''
      this.messages.push({ id: uid(), role: 'user', text: question, sources: [] })
      this.tab = 'chat'
      this.busy = true
      const generation = ++this.generation
      this.controller = new AbortController()
      try {
        const answer = await askAssistant({
          question,
          materials: this.searchable,
          signal: this.controller.signal
        })
        if (generation !== this.generation) return
        const message = { id: uid(), role: 'assistant', text: '', sources: [] }
        this.messages.push(message)
        let position = 0
        this.streamTimer = setInterval(() => {
          if (generation !== this.generation) return
          position += 7
          message.text = answer.text.slice(0, position)
          this.scroll()
          if (position >= answer.text.length) {
            clearInterval(this.streamTimer)
            message.sources = answer.sources
            this.busy = false
            this.scroll()
          }
        }, 22)
      } catch (error) {
        if (error.name !== 'AbortError') notify('检索失败，请重试。')
        this.busy = false
      }
    },
    stop() {
      ++this.generation
      clearInterval(this.streamTimer)
      if (this.controller) this.controller.abort()
      if (this.busy)
        this.messages.push({
          id: uid(),
          role: 'assistant',
          text: '已停止显示本次结果。',
          sources: []
        })
      this.busy = false
    },
    scroll() {
      this.$nextTick(() => {
        if (this.$refs.messages) this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight
      })
    },
    locate(source) {
      if (!this.materials.some((m) => m.id === source.materialId)) {
        notify('引用资料已删除，请重新导入。')
        return
      }
      this.materialId = source.materialId
      this.tab = 'document'
      this.highlighted = true
      clearTimeout(this.highlightTimer)
      this.highlightTimer = setTimeout(() => {
        this.highlighted = false
      }, 1800)
      this.$nextTick(() => {
        const doc = this.$refs.document
        if (doc) {
          const paragraphs = Array.from(doc.querySelectorAll('.paper-paragraph'))
          const target = paragraphs.find((p) => p.textContent === source.excerpt)
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.studio-layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  height: calc(100dvh - 245px);
  min-height: 540px;
}

.studio-page .course-select {
  width: 210px;
}

.mobile-study-tabs {
  display: none;
}

.document-panel {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.document-toolbar {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid @border;

  select {
    flex: 1;
    max-width: 100%;
    background: #0b2338;
    border: 1px solid #21455c;
    border-radius: 5px;
    padding: 8px;
    font-size: 13px;
  }
}

.document-paper {
  margin: 12px;
  padding: 36px 32px;
  background: #f9fcff;
  color: #152536;
  overflow-y: auto;
  flex: 1;
  font-family: 'SimSun', 'Songti SC', serif;
  border-radius: 3px;
  font-size: 17px;
  transition: box-shadow 0.2s;

  h2 {
    font-size: 26px;
    padding-bottom: 20px;
    border-bottom: 1px solid #b4c7d4;
    margin-bottom: 28px;
  }

  .document-kicker {
    font-family: 'Microsoft YaHei', sans-serif;
    font-size: 10px;
    color: #698395;
    display: block;
    margin-bottom: 12px;
  }

  .paper-paragraph {
    margin: 0 0 23px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 2;

    &.definition {
      padding: 12px 16px;
      border-radius: 6px;
      background: #dcf4fd;
      color: #0e4b80;
    }
  }

  .paper-footer {
    border-top: 1px solid #cfdae2;
    padding-top: 18px;
    margin-top: 30px;
    font-size: 11px;
    font-family: 'Microsoft YaHei', sans-serif;
    color: #617b8e;
  }

  &.source-highlight {
    box-shadow: inset 0 0 0 4px #00cfff;
  }
}

.studio-pdf {
  width: 100%;
  height: 100%;
  flex: 1;
  border: 0;
  min-height: 450px;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;

  >.panel-heading {
    padding: 17px 20px;
    margin: 0;
    border-bottom: 1px solid @border;
  }
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 17px;
  scroll-behavior: smooth;
}

.chat-intro {
  margin: 6px 0 30px;

  >.app-icon {
    color: #3dd6ff;
    margin-bottom: 12px;
  }

  h3 {
    font-size: 19px;
    margin: 0 0 10px;
  }

  p {
    font-size: 12px;
    color: #8bafcd;
  }
}

.suggestion-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  border: 1px solid #214860;
  background: #0b2941;
  border-radius: 6px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 8px;
  font-size: 13px;
  text-align: left;
  color: #b1d9f3;

  &:hover {
    border-color: @cyan;
  }
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 18px 0;

  .message-body {
    padding: 14px;
    background: #0d2c46;
    border: 1px solid #234b69;
    border-radius: 10px;
    flex: 1;
    min-width: 0;
  }

  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14px;
    margin: 0;
    line-height: 1.9;
  }

  &.user {
    flex-direction: row-reverse;
    margin-left: 28px;

    .message-body {
      background: #12519e;
      border-color: #1762bf;
    }
  }
}

.assistant-avatar {
  width: 32px;
  height: 32px;
  border: 1px solid #00bafa;
  color: #00c4ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.chat-compose {
  padding: 13px 16px 16px;
  border-top: 1px solid @border;

  >p {
    font-size: 10px;
    margin-bottom: 10px;
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }

  form {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  textarea {
    background: #061c2d;
    border: 1px solid #295678;
    padding: 10px 12px;
    border-radius: 7px;
    resize: none;
    flex: 1;
    min-height: 52px;
    max-height: 140px;
    font-size: 13px;
  }
}

.send-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: @blue;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 900px) and (min-width: 768px) {
  .studio-layout {
    grid-template-columns: 1fr 1fr;
  }

  .studio-layout .document-paper {
    padding: 24px 18px;
    font-size: 15px;
  }
}

@media (max-width: 767px) {
  .document-toolbar {
    padding: 12px;
    gap: 8px;

    select {
      font-size: 12px;
    }

    .badge {
      font-size: 9px;
    }
  }

  .mobile-study-tabs {
    display: flex;
    margin-bottom: 12px;

    button {
      flex: 1;
    }
  }

  .studio-layout {
    display: block;
    height: auto;
    min-height: 0;

    .mobile-hidden {
      display: none;
    }

    >.panel {
      height: calc(100dvh - 340px);
      min-height: 420px;
    }
  }

  .studio-page .course-select {
    width: 100%;
    min-height: 40px;
  }

  .studio-page .page-heading {
    gap: 12px;
  }

  .document-paper {
    margin: 8px;
    padding: 26px 20px;
    font-size: 16px;

    h2 {
      font-size: 22px;
    }
  }

  .chat-compose {
    padding: 12px;

    textarea {
      font-size: 16px;
    }
  }

  .chat-panel {
    padding: 18px 15px;
  }
}
</style>
