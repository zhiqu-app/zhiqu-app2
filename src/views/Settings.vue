<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>个人与设置</h1>
        <p>管理个人资料与学习偏好，让这里适合你的学习节奏。</p>
      </div>
      <button class="button secondary" @click="logout">
        <AppIcon name="logout" :size="18" />{{ state.mode === 'account' ? '退出登录' : '退出体验' }}
      </button>
    </header>
    <div class="tabs settings-tabs">
      <button class="active">基本资料</button><router-link to="/app/reports">学习记录</router-link>
      <router-link to="/app/plan">复习计划</router-link>
    </div>
    <div class="settings-grid">
      <section class="panel">
        <h2>基本资料</h2>
        <form @submit.prevent="save">
          <div class="profile-editor">
            <UserAvatar :name="form.name" :size="76" />
            <p class="small muted">知序默认头像</p>
          </div>
          <label class="field-label" for="user-name">昵称</label>
          <input
            id="user-name"
            v-model.trim="form.name"
            class="input"
            required
            maxlength="20"/>
          <label class="field-label" for="user-major">专业</label>
          <input id="user-major" v-model.trim="form.major" class="input" maxlength="30" /><label
            class="field-label"
            for="user-grade"
            >年级</label>
          <select id="user-grade" v-model="form.grade" class="input">
            <option v-for="g in grades" :key="g">{{ g }}</option></select>
          <label class="field-label" for="user-email">联系邮箱（选填）</label>
          <input
            id="user-email"
            v-model.trim="form.email"
            class="input"
            type="email"
            maxlength="100"
          /><button class="button primary full-width settings-save" :disabled="!form.name">
            保存资料
          </button>
        </form>
      </section>
      <section class="panel">
        <h2>学习偏好</h2>
        <label class="preference-row">
          <AppIcon name="spark" />
          <span><strong>减少动态效果</strong><small>关闭浮动插画与转场运动</small></span>
          <input
            v-model="form.reducedMotion"
            type="checkbox"
            class="switch"
            @change="savePreference" />
          </label>
        <label class="preference-row">
          <AppIcon name="bell" />
          <span>
            <strong>显示学习提醒</strong><small>仅控制应用内提醒，不推送系统通知</small>
          </span>
          <input v-model="form.reminders" type="checkbox" class="switch" @change="savePreference"/>
        </label>
        <div class="settings-note">
          <AppIcon name="info" />
          <div>
            <h3>关于当前演示空间</h3>
            <p>
              这是可独立运行的 Vue 2 前端。课程、文本、练习与计划保存在当前浏览器。AI
              答疑为本地检索演示；账号和个人资料已支持后端验证，学习业务尚未云端同步。
            </p>
            <p>
              PDF 使用临时文件地址预览，刷新后需要重新导入。请勿把本地浏览器当作唯一的资料备份。
            </p>
          </div>
        </div>
        <router-link to="/app/knowledge" class="action-row">
          <AppIcon name="graph" />知识路线<AppIcon name="chevron" :size="18" />
        </router-link>
        <router-link to="/app/reports" class="action-row">
          <AppIcon name="chart" />学习报告<AppIcon name="chevron" :size="18"/>
        </router-link>
      </section>
    </div>
    <section class="panel data-settings">
      <h2>数据管理</h2>
      <div class="preference-row">
        <AppIcon name="download" />
        <span>
          <strong>导出学习数据</strong>
          <small>课程、文字资料、练习记录与计划，JSON 格式</small>
        </span>
        <button class="button secondary small-button" @click="exportData">导出数据</button>
      </div>
      <div class="preference-row">
        <AppIcon name="trash" /><span>
          <strong>重置本地学习数据</strong>
          <small>{{
            state.mode === 'account'
              ? '清空当前账号的本机学习记录；保留账号和个人资料'
              : '删除本地课程与作答，恢复内置示例；保留个人资料'
          }}</small></span>
        <button class="button danger small-button" @click="confirmReset = true">重置数据</button>
      </div>
    </section>
    <AppModal v-if="confirmReset" title="重置本地学习数据？" @close="confirmReset = false">
      <p>
        当前课程、文字资料、练习和复习计划会被删除，并{{
          state.mode === 'account' ? '清空本机学习记录' : '恢复示例数据'
        }}。建议先导出备份。
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="confirmReset = false">取消</button>
        <button class="button danger" @click="reset">确认重置</button>
      </div>
      </AppModal>
  </div>
</template>
<script>
import UserAvatar from '../components/UserAvatar.vue'
import AppModal from '../components/AppModal.vue'
import { state, persist, notify, resetData } from '../store'
import { logoutAccount } from '../services/auth'
import { api } from '../services/api'
export default {
  name: 'Settings',
  components: { UserAvatar, AppModal },
  data: () => ({
    state,
    form: { ...state.settings },
    confirmReset: false,
    grades: ['大一', '大二', '大三', '大四', '研究生', '其他']
  }),
  methods: {
    async save() {
      if (!this.form.name) return
      try {
        const profile = state.mode === 'account' ? await api.saveProfile(this.form) : this.form
        Object.assign(state.settings, profile)
        if (state.account) state.account.profile = { ...profile }
        if (persist()) notify('个人资料已保存')
      } catch (error) {
        notify(error.message)
      }
    },
    async savePreference() {
      try {
        const values = { reducedMotion: this.form.reducedMotion, reminders: this.form.reminders }
        if (state.mode === 'account') await api.saveProfile(values)
        Object.assign(state.settings, values)
        persist()
      } catch (error) {
        this.form.reducedMotion = state.settings.reducedMotion
        this.form.reminders = state.settings.reminders
        notify(error.message)
      }
    },
    async logout() {
      try {
        await logoutAccount()
      } catch (_) {
        notify('已清除本机登录状态，服务端会话撤销未确认。')
      } finally {
        this.$router.replace('/login')
      }
    },
    reset() {
      resetData()
      sessionStorage.removeItem('zhixu-practice-draft')
      this.confirmReset = false
      notify(state.mode === 'account' ? '已清空当前账号的本机学习记录' : '已恢复内置示例数据')
    },
    exportData() {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              courses: state.courses,
              materials: state.materials.filter((m) => !m.temporary),
              tasks: state.tasks,
              attempts: state.attempts,
              settings: state.settings
            },
            null,
            2
          )
        ],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '知序-本地数据备份.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify('数据备份已导出')
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.settings-tabs {
  margin-bottom: 20px;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;
  > .panel {
    padding: 28px;
  }
}
.profile-editor {
  text-align: center;
  margin: 22px 0;
  > p {
    margin: 10px 0 0;
  }
}
.settings-save {
  margin-top: 25px;
}
.preference-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 23px 0;
  border-bottom: 1px solid #1c3a51;
  > .app-icon {
    color: #32c5ec;
  }
  > span {
    flex: 1;
  }
  strong {
    font-size: 14px;
    font-weight: 500;
    display: block;
  }
  small {
    color: #7fa6c1;
    font-size: 11px;
    display: block;
    margin-top: 6px;
  }
  &:last-child {
    border-bottom: 0;
  }
}
.switch {
  appearance: none;
  width: 38px;
  height: 22px;
  border-radius: 20px;
  background: #24465f;
  position: relative;
  cursor: pointer;
  flex: none;
  &::before {
    content: '';
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #c9e6f5;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s;
  }
  &:checked {
    background: #00a8d2;
    &::before {
      transform: translateX(16px);
      background: white;
    }
  }
}
.settings-note {
  display: flex;
  gap: 12px;
  margin: 25px 0 10px;
  color: #8ab1cd;
  .app-icon {
    color: #34b7e9;
    margin-top: 4px;
  }
  h3 {
    color: #c2dced;
    font-size: 14px;
    margin-bottom: 10px;
  }
  p {
    font-size: 12px;
  }
}
.data-settings {
  margin-top: 22px;
  padding: 28px;
}
@media (max-width: 767px) {
  .settings-grid {
    grid-template-columns: 1fr;
    > .panel {
      padding: 22px;
    }
  }
  .preference-row {
    gap: 10px;
    small {
      font-size: 10px;
    }
    strong {
      font-size: 13px;
    }
  }
  .data-settings {
    padding: 20px;
    .preference-row {
      flex-wrap: wrap;
      > span {
        flex-basis: calc(100% - 40px);
      }
      > .button {
        margin-left: auto;
      }
    }
  }
  .settings-tabs {
    gap: 5px;
    > button,
    > a {
      font-size: 12px;
      padding: 8px 17px;
    }
  }
}
</style>
