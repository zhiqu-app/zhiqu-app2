<template>
  <main class="login-page">
    <PublicHeader>
      <BrandLogo /><router-link to="/welcome" class="text-button">返回产品首页
        <AppIcon name="arrow" :size="16" />
      </router-link>
    </PublicHeader>
    <div class="login-layout">
      <section class="login-art">
        <h1>每一次连接，都从这里开始</h1>
        <p>回到课程资料、练习与复习。</p>
        <BookStage :state="artState" />
        <div class="login-art-points">
            <span>
                <i class="dot cyan" />课程有序归档
            </span>
            <span>
                <i class="dot cyan" />学习持续积累
            </span>
            <span>
                <i class="dot amber" />每一步都有方向
            </span>
        </div>
      </section>
      <section class="panel login-card">
        <span class="eyebrow">欢迎回到你的学习空间</span>
        <h2>登录知序</h2>
        <p class="muted">当前为本地体验，不会验证或发送账号信息。</p>
        <form @submit.prevent="submit">
            <label class="field-label" for="email">邮箱</label>
            <div class="input-with-icon" :class="{ focused: focused === 'email' }">
                <AppIcon name="mail" :size="18" /><input id="email" ref="email" v-model.trim="email" type="email"
                placeholder="输入邮箱（体验可留空）" autocomplete="email" enterkeyhint="next" @focus="focused = 'email'"
                @blur="focused = ''" @keydown.enter.prevent="$refs.password.focus()" />
            </div>
            <label class="field-label" for="password">密码</label>
            <div class="input-with-icon" :class="{ focused: focused === 'password' }">
                <AppIcon name="lock" :size="18" />
                <input id="password" ref="password" v-model="password"
                :type="visible ? 'text' : 'password'" placeholder="体验模式无需真实密码" autocomplete="off" enterkeyhint="go"
                @focus="focused = 'password'" @blur="focused = ''" />
                <button class="icon-button" type="button"
                :aria-label="visible ? '隐藏密码' : '显示密码'" :aria-pressed="String(visible)" @mousedown.prevent
                @click="visible = !visible">
                  <AppIcon name="eye" :size="18" />
                </button>
            </div>
            <div class="login-options">
                <span class="muted small">密码仅保留在当前输入框中</span>
                <button type="button" class="text-button"
                @click="notify('真实账号注册与找回密码需由团队接入后端服务。')">
                    需要帮助？
                </button>
            </div>
            <p v-if="error" class="error-message" role="alert">{{ error }}</p>
            <button class="button primary full-width" type="submit" :disabled="busy">
                {{ busy ? '正在进入' : '进入演示学习空间' }}
                <AppIcon name="arrow" :size="18" />
            </button>
        </form>
        <div class="login-divider"><span>或者</span></div>
        <button class="button secondary full-width" :disabled="busy" @click="submit">
            直接体验示例课程
        </button>
        <p class="login-note">真实登录及 AI 服务接入后，可替换现有演示适配层。</p>
      </section>
    </div>
  </main>
</template>
<script>
import PublicHeader from '../components/PublicHeader.vue'
import BrandLogo from '../components/BrandLogo.vue'
import BookStage from '../components/BookStage.vue'
import { enterDemo, state, persist, notify } from '../store'
export default {
  name: 'Login',
  components: { PublicHeader, BrandLogo, BookStage },
  data: () => ({ email: '', password: '', visible: false, focused: '', error: '', busy: false }),
  computed: {
    artState() {
      return this.focused === 'email'
        ? 'email'
        : this.focused === 'password'
          ? this.visible
            ? 'reveal'
            : 'password'
          : 'idle'
    }
  },
  methods: {
    notify,
    submit() {
        if (this.busy) return
        this.error = ''
        if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            this.error = '请输入有效的邮箱地址。'
            return
        }
        this.busy = true
        if (this.email) {
            state.settings.email = this.email
            persist()
        }
        this.password = ''
        enterDemo()
        const redirect = this.$route.query.redirect
        this.$router.push(
            typeof redirect === 'string' && redirect.startsWith('/app/') ? redirect : '/app/overview'
      )
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.login-page {
  min-height: 100dvh;
  background: radial-gradient(ellipse at 30% 40%, #0a3050, #031524 65%);
}

.login-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  align-items: center;
  gap: 50px;
  max-width: 1380px;
  margin: 35px auto 0;
  padding: 30px 5% 70px;
}

.login-art {
  min-width: 0;

  h1 {
    font-size: 33px;
  }

  >p {
    color: #9cc7e7;
    letter-spacing: 3px;
  }

  .book-stage {
    margin: -20px auto -10px;
  }
}

.login-art-points {
  display: flex;
  justify-content: center;
  gap: 22px;
  font-size: 12px;
  color: #8dbbda;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.login-card {
  padding: 34px;
  max-width: 440px;
  width: 100%;
  justify-self: end;

  .eyebrow {
    color: #6ea9ce;
    font-size: 11px;
  }

  h2 {
    font-size: 26px;
    margin-bottom: 9px;
  }

  >.muted {
    font-size: 12px;
  }

  .login-options {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin: 15px 0 22px;

    .text-button {
      font-size: 11px;
    }

    .small {
      font-size: 10px;
    }
  }

  .login-note {
    font-size: 10px;
    color: #7396b3;
    text-align: center;
    margin: 22px 0 0;
  }
}

.login-divider {
  position: relative;
  text-align: center;
  font-size: 11px;
  color: #6287a6;
  margin: 22px 0;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    border-top: 1px solid #1a3b52;
  }

  span {
    background: #0b2133;
    position: relative;
    padding: 0 15px;
  }
}

@media (max-width: 1199px) {
  .login-layout {
    gap: 20px;
    grid-template-columns: 1.1fr 1fr;
  }

  .login-art h1 {
    font-size: 26px;
  }

  .login-art-points {
    gap: 12px;
    font-size: 10px;
  }
}

@media (max-width: 900px) and (min-width: 768px) {
  .login-art-points {
    flex-wrap: wrap;
  }
}

@media (max-width: 767px) {
  .login-layout {
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    padding: 5px 20px 40px;
    gap: 5px;
  }

  .login-art {
    width: 100%;
    text-align: center;

    h1 {
      font-size: 24px;
      margin-top: 15px;
    }

    >p {
      font-size: 12px;
      letter-spacing: 1px;
    }

    .book-stage {
      max-width: 360px;
      margin: -40px auto -50px;
    }

    .login-art-points {
      display: none;
    }
  }

  .login-card {
    padding: 24px;
    max-width: 450px;
    justify-self: center;
    margin-top: 0;

    h2 {
      font-size: 24px;
    }

    .field-label {
      font-size: 13px;
    }

    .login-options {
      margin-bottom: 18px;
    }
  }

  .login-page:focus-within .login-art .book-stage {
    display: none;
  }
}

@media (max-height: 600px) and (max-width: 767px) {
  .login-art {
    display: none;
  }
}
</style>
