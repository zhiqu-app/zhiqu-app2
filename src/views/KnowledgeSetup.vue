<template>
  <main class="knowledge-setup-page">
    <PublicHeader>
      <BrandLogo />
      <button class="text-button" :disabled="busy" @click="signOut">退出登录</button>
    </PublicHeader>
    <div class="setup-shell">
      <header class="setup-heading">
        <div>
          <h1>配置你的知识星图</h1>
          <p>选一个学习方向，让接下来的每一步都有迹可循。</p>
        </div>
        <router-link v-if="state.knowledgeGraph && !loadError" to="/app/overview" class="text-button">返回学习空间</router-link>
      </header>

      <section v-if="loading" class="panel setup-status" role="status">正在读取你的学习配置…</section>
      <section v-else-if="loadError" class="panel setup-status">
        <h2>暂时无法读取星图</h2>
        <p class="error-message" role="alert">{{ loadError }}</p>
        <button class="button primary" @click="load(true)">重新加载</button>
      </section>

      <div v-else class="setup-layout">
        <form class="panel setup-form" @submit.prevent="submit">
          <fieldset :disabled="busy">
            <legend>你想学习什么？</legend>
            <div class="subject-options">
              <button v-for="item in subjects" :key="item.id" type="button"
                :aria-label="item.label" :aria-pressed="String(subject === item.id)"
                :class="['subject-option', { active: subject === item.id }]" @click="subject = item.id">
                <strong>{{ item.label }}</strong><span>{{ item.description }}</span>
              </button>
            </div>
            <label class="field-label" for="learning-level">当前基础</label>
            <select id="learning-level" v-model="level" class="input">
              <option v-for="item in levels" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
            <label class="field-label" for="learning-goal">学习目标</label>
            <textarea id="learning-goal" v-model="goal" class="input" rows="3" minlength="2" maxlength="180"
              required placeholder="例如：理解网络分层，完成本学期的期末复习" aria-describedby="goal-hint" />
            <p id="goal-hint" class="muted small">写下你希望完成的事，2～180 字。{{ goal.length }}/180</p>
          </fieldset>
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
          <button class="button primary full-width" type="submit" :disabled="busy || !subject">
            {{ busy ? '正在保存学习路线…' : '保存并进入学习空间' }}
            <AppIcon name="arrow" :size="18" />
          </button>
          <p class="setup-save-note">配置会保存在你的账号中。更换学习方向时，原课程与资料仍会保留。</p>
        </form>

        <aside class="setup-preview panel" aria-label="学习路线预览">
          <div class="preview-heading"><span class="badge">路线预览</span><span class="muted small">保存后成为你的个人星图</span></div>
          <template v-if="chosen">
            <h2>{{ chosen.label }}</h2>
            <p class="muted">{{ chosen.description }}</p>
            <KnowledgeGraph :title="chosen.label + '路线预览'" :nodes="chosen.nodes" :edges="chosen.edges"
              :selected="previewNode ? previewNode.id : ''" @select="previewSelected = $event.id" />
            <div class="preview-description">
              <strong>{{ previewNode ? previewNode.label : '点击一个知识点' }}</strong>
              <p>{{ previewNode ? previewNode.description : '查看这一步需要理解什么。' }}</p>
            </div>
          </template>
          <div v-else class="preview-empty">
            <AppIcon name="graph" :size="64" />
            <h2>从你想学的方向开始</h2>
            <p>选择左侧课程，预览知识点之间的连接。</p>
          </div>
          <p class="preview-note"><AppIcon name="info" :size="16" />路线按课程目录建立；当前基础与目标会一并保存，供后续学习参考。</p>
        </aside>
      </div>
    </div>
  </main>
</template>

<script>
import PublicHeader from '../components/PublicHeader.vue'
import BrandLogo from '../components/BrandLogo.vue'
import KnowledgeGraph from '../components/KnowledgeGraph.vue'
import { state } from '../store'
import { getGraphOptions, loadCurrentGraph, configureGraph } from '../services/knowledge'
import { logoutAccount } from '../services/auth'

export default {
  name: 'KnowledgeSetup',
  components: { PublicHeader, BrandLogo, KnowledgeGraph },
  data: () => ({ state, subjects: [], levels: [], subject: '', level: 'beginner', goal: '',
    previewSelected: '', loading: true, busy: false, error: '', loadError: '', loadRevision: 0 }),
  computed: {
    accountId() { return this.state.account?.id || '' },
    chosen() { return this.subjects.find(item => item.id === this.subject) || null },
    previewNode() {
      return this.chosen?.nodes.find(node => node.id === this.previewSelected) || this.chosen?.nodes[0] || null
    }
  },
  watch: {
    subject() { this.previewSelected = '' },
    // 同一路由被复用时也要清除上个账号的表单，不能只依赖组件销毁。
    accountId() {
      ++this.loadRevision
      this.subject = ''
      this.level = 'beginner'
      this.goal = ''
      this.subjects = []
      this.levels = []
      this.previewSelected = ''
      this.error = ''
      this.loadError = ''
      if (this.accountId) this.load()
    }
  },
  created() {
    // 路由检查已失败时先展示原因，由用户显式重试，避免重复请求掩盖错误。
    if (state.knowledgeStatus === 'error') {
      this.loading = false
      this.loadError = state.knowledgeError
    } else this.load()
  },
  methods: {
    async load(force = false) {
      const revision = ++this.loadRevision
      this.loading = true
      this.loadError = ''
      try {
        const graph = await loadCurrentGraph({ force })
        const options = await getGraphOptions()
        if (this._isDestroyed || revision !== this.loadRevision) return
        if (!Array.isArray(options.subjects) || !Array.isArray(options.levels) || !options.subjects.length) {
          throw new Error('暂时没有可用的学习方向，请稍后重试。')
        }
        this.subjects = options.subjects
        this.levels = options.levels
        this.subject = graph?.subject || ''
        this.level = graph?.level || 'beginner'
        this.goal = graph?.goal || ''
      } catch (error) {
        if (this._isDestroyed || revision !== this.loadRevision) return
        if (error.status === 401) return this.$router.replace('/login')
        if (error.name !== 'AbortError') this.loadError = error.message || '星图加载失败，请重试。'
      } finally {
        if (!this._isDestroyed && revision === this.loadRevision) this.loading = false
      }
    },
    async submit() {
      if (this.busy) return
      this.error = ''
      if (!this.chosen || this.goal.trim().length < 2) {
        this.error = '请选择学习方向，并填写至少 2 字的学习目标。'
        return
      }
      this.busy = true
      try {
        await configureGraph({ subject: this.subject, level: this.level, goal: this.goal.trim() })
        const target = this.$route.query.redirect
        await this.$router.replace(typeof target === 'string' && target.startsWith('/app/') ? target : '/app/overview')
      } catch (error) {
        if (error.status === 401) return this.$router.replace('/login')
        if (error.name !== 'AbortError' && error.name !== 'NavigationDuplicated') this.error = error.message || '保存失败，请重试。'
      } finally {
        this.busy = false
      }
    },
    async signOut() {
      this.busy = true
      try { await logoutAccount() }
      catch (_) { /* 本地会话仍由 logoutAccount 的 finally 清理。 */ }
      finally {
        this.busy = false
        await this.$router.replace('/login')
      }
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 配置页面：表单与路线预览并排；小屏按填写、预览顺序排列。 */
.knowledge-setup-page { min-height: 100dvh; background: @bg; }
.setup-shell { max-width: 1320px; margin: 0 auto; padding: 40px 5% 70px; }
.setup-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px;
  h1 { font-size: 30px; margin: 0 0 10px; }
  p { color: @muted; margin: 0; }
}
.setup-layout { display: grid; grid-template-columns: 1fr 1.1fr; gap: 24px; align-items: start; }
.setup-form { padding: 28px;
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  legend { font-size: 18px; font-weight: 600; margin-bottom: 18px; padding: 0; }
  .input { display: block; width: 100%; background: @bg; border: 1px solid @border; color: @text; border-radius: 6px; padding: 12px; font: inherit; }
  textarea { resize: vertical; min-height: 104px; }
  .field-label { margin-top: 24px; }
  .input:focus-visible { outline: 2px solid @cyan; outline-offset: 2px; }
  .full-width { margin-top: 20px; }
}
.subject-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.subject-option { text-align: left; padding: 15px; color: @text; border: 1px solid @border; border-radius: 7px; background: @surface-raised;
  strong { display: block; font-size: 14px; }
  span { display: block; color: @muted; font-size: 11px; line-height: 1.7; margin-top: 7px; }
  &.active { border-color: @cyan; background: #10344b; box-shadow: inset 3px 0 @cyan; }
  &:focus-visible { outline: 2px solid @amber; outline-offset: 3px; }
  &:disabled { opacity: .65; }
}
.setup-save-note, .preview-note { color: @muted; font-size: 12px; line-height: 1.8; }
.setup-save-note { margin-bottom: 0; }
.setup-preview { padding: 28px; position: sticky; top: 24px;
  h2 { font-size: 26px; margin: 30px 0 10px; }
  > .muted { font-size: 13px; line-height: 1.8; }
}
.preview-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.preview-description { border-left: 2px solid @amber; padding-left: 16px; min-height: 90px;
  strong { color: @amber; }
  p { color: @muted; font-size: 13px; line-height: 1.8; }
}
.preview-note { display: flex; align-items: flex-start; gap: 9px; border-top: 1px solid @border; padding-top: 20px; margin: 20px 0 0;
  .app-icon { flex-shrink: 0; margin-top: 3px; }
}
.preview-empty { min-height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  .app-icon { color: @cyan; }
  h2 { font-size: 21px; }
  p { color: @muted; font-size: 13px; line-height: 1.8; }
}
.setup-status { padding: 40px; min-height: 200px;
  h2 { margin-top: 0; }
  .button { margin-top: 16px; }
}
@media (max-width: 900px) {
  .setup-layout { grid-template-columns: 1fr; }
  .setup-preview { position: static; }
}
@media (max-width: 480px) {
  .setup-shell { padding: 24px 16px 40px; }
  .setup-heading { align-items: flex-start; flex-direction: column;
    h1 { font-size: 25px; }
    p { font-size: 13px; line-height: 1.8; }
  }
  .setup-form, .setup-preview, .setup-status { padding: 20px 16px; }
  .subject-option { padding: 12px; }
}
</style>
