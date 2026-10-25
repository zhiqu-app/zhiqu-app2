<template>
  <main class="register-page">
    <PublicHeader>
      <BrandLogo />
      <router-link to="/login" class="text-button"
        >已有账号，去登录 <AppIcon name="arrow" :size="16"
      /></router-link>
    </PublicHeader>

    <div class="register-layout">
      <section class="register-art">
        <span class="eyebrow">知序 · 你的学习空间</span>
        <h1>从一个属于你的账号开始</h1>
        <p>验证邮箱，让资料、思考与每一次进步有处安放。</p>
        <BookStage :state="artState" />
        <ol class="register-steps" aria-label="注册流程">
          <li :class="{ complete: sent || registered }"><span>01</span>验证邮箱</li>
          <li :class="{ complete: validPassword && confirmed }"><span>02</span>设置密码</li>
          <li :class="{ complete: registered }"><span>03</span>开启学习</li>
        </ol>
      </section>

      <section class="panel register-card">
        <template v-if="registered">
          <div class="register-success" role="status">
            <span class="success-icon"><AppIcon name="check" :size="32" /></span>
            <span class="eyebrow">邮箱验证完成</span>
            <h2>欢迎加入，{{ name }}</h2>
            <p>{{ normalizedEmail }}</p>
            <p class="muted">账号已创建并登录，你的学习空间从这里开始。</p>
            <button class="button primary full-width" @click="enterWorkspace">
              进入学习空间 <AppIcon name="arrow" :size="18" />
            </button>
          </div>
        </template>

        <template v-else>
          <span class="eyebrow">建立你的学习账号</span>
          <h2>注册知序</h2>
          <p class="register-intro">使用邮箱接收验证码，完成身份确认。</p>
          <form novalidate @submit.prevent="submit">
            <label class="field-label" for="register-name">昵称</label>
            <input
              id="register-name"
              v-model.trim="name"
              class="input"
              autocomplete="nickname"
              maxlength="20"
              placeholder="希望我们怎么称呼你"
              :disabled="busy"
            />

            <label class="field-label" for="register-email">邮箱</label>
            <div class="input-with-icon" :class="{ focused: focused === 'email' }">
              <AppIcon name="mail" :size="18" />
              <input
                id="register-email"
                v-model.trim="email"
                type="email"
                autocomplete="email"
                maxlength="100"
                placeholder="输入你的常用邮箱"
                :disabled="busy || sending"
                @focus="focused = 'email'"
                @blur="focused = ''"
              />
            </div>

            <label class="field-label" for="register-code">邮箱验证码</label>
            <div class="code-row">
              <input
                id="register-code"
                v-model="code"
                class="input code-input"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="6 位数字验证码"
                :disabled="busy"
                @focus="focused = 'code'"
                @blur="focused = ''"
              />
              <button
                type="button"
                class="button secondary code-send"
                :disabled="busy || sending || !validEmail || remaining > 0"
                @click="sendCode"
              >
                {{
                  sending
                    ? '正在发送…'
                    : remaining > 0
                      ? `${remaining}s 后重发`
                      : sent
                        ? '重新发送'
                        : '获取验证码'
                }}
              </button>
            </div>
            <p class="field-hint" :class="{ 'hint-sent': sent }" role="status">
              {{
                sent
                  ? '邮件已发送，验证码 5 分钟内有效，请留意垃圾邮件。'
                  : '验证码将发送到上面的邮箱。'
              }}
            </p>

            <label class="field-label" for="register-password">设置密码</label>
            <div class="input-with-icon" :class="{ focused: focused === 'password' }">
              <AppIcon name="lock" :size="18" />
              <input
                id="register-password"
                v-model="password"
                :type="visible ? 'text' : 'password'"
                autocomplete="new-password"
                maxlength="128"
                placeholder="至少 8 位，建议组合字母和数字"
                :disabled="busy"
                @focus="focused = 'password'"
                @blur="focused = ''"
              />
              <button
                type="button"
                class="icon-button"
                :aria-label="visible ? '隐藏密码' : '显示密码'"
                :aria-pressed="String(visible)"
                @mousedown.prevent
                @click="visible = !visible"
              >
                <AppIcon name="eye" :size="18" />
              </button>
            </div>

            <label class="field-label" for="register-confirm">确认密码</label>
            <input
              id="register-confirm"
              v-model="confirmation"
              class="input"
              :type="visible ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="128"
              placeholder="再次输入密码"
              :disabled="busy"
              @focus="focused = 'confirm'"
              @blur="focused = ''"
            />
            <div class="password-checks" aria-live="polite">
              <span :class="{ valid: validPassword }"><i />8～128 位密码</span>
              <span :class="{ valid: confirmed }"><i />两次输入一致</span>
            </div>

            <p v-if="error" class="error-message" role="alert">{{ error }}</p>
            <button
              class="button primary full-width register-submit"
              type="submit"
              :disabled="busy || sending"
            >
              {{ busy ? '正在验证并创建…' : '验证邮箱并注册' }} <AppIcon name="arrow" :size="18" />
            </button>
          </form>
          <p class="register-footer">已有账号？<router-link to="/login">直接登录</router-link></p>
        </template>
      </section>
    </div>
  </main>
</template>

<script>
import PublicHeader from '../components/PublicHeader.vue'
import BrandLogo from '../components/BrandLogo.vue'
import BookStage from '../components/BookStage.vue'
import { api } from '../services/api'
import { registerAccount } from '../services/auth'

export default {
  name: 'Register',
  components: { PublicHeader, BrandLogo, BookStage },
  data: () => ({
    name: '',
    email: '',
    code: '',
    password: '',
    confirmation: '',
    visible: false,
    focused: '',
    error: '',
    sending: false,
    busy: false,
    registered: false,
    sentEmail: '',
    cooldowns: {},
    now: Date.now()
  }),
  computed: {
    normalizedEmail() {
      return this.email.trim().toLowerCase()
    },
    validEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.normalizedEmail)
    },
    validPassword() {
      return this.password.length >= 8 && this.password.length <= 128
    },
    confirmed() {
      return !!this.confirmation && this.password === this.confirmation
    },
    sent() {
      return this.sentEmail === this.normalizedEmail && !!this.sentEmail
    },
    remaining() {
      return Math.max(0, Math.ceil(((this.cooldowns[this.normalizedEmail] || 0) - this.now) / 1000))
    },
    artState() {
      if (this.registered) return 'ready'
      if (['email', 'code'].includes(this.focused)) return 'email'
      if (['password', 'confirm'].includes(this.focused))
        return this.visible ? 'reveal' : 'password'
      return 'idle'
    }
  },
  watch: {
    normalizedEmail() {
      this.code = ''
      this.error = ''
    },
    code(value) {
      this.code = value.replace(/[^0-9]/g, '').slice(0, 6)
    }
  },
  mounted() {
    this.clock = setInterval(() => {
      this.now = Date.now()
    }, 500)
  },
  beforeDestroy() {
    clearInterval(this.clock)
  },
  methods: {
    async sendCode() {
      if (this.sending || this.busy || this.remaining > 0) return
      if (!this.validEmail) {
        this.error = '请先输入有效的邮箱地址。'
        return
      }
      this.sending = true
      this.error = ''
      const email = this.normalizedEmail
      try {
        const result = await api.sendEmailCode(email)
        this.sentEmail = email
        this.now = Date.now()
        this.$set(this.cooldowns, email, this.now + result.resendAfter * 1000)
        this.$nextTick(() => this.$el.querySelector('#register-code')?.focus())
      } catch (error) {
        this.error = error.message
        if (error.retryAfter) {
          this.now = Date.now()
          this.$set(this.cooldowns, email, this.now + error.retryAfter * 1000)
        }
      } finally {
        this.sending = false
      }
    },
    async submit() {
      if (this.busy || this.sending) return
      this.error = ''
      if (!this.name) {
        this.error = '请输入昵称。'
        return
      }
      if (!this.validEmail) {
        this.error = '请输入有效的邮箱地址。'
        return
      }
      if (!/^[0-9]{6}$/.test(this.code)) {
        this.error = '请输入邮件中的 6 位验证码。'
        return
      }
      if (!this.validPassword) {
        this.error = '密码长度应为 8～128 位。'
        return
      }
      if (!this.confirmed) {
        this.error = '两次输入的密码不一致。'
        return
      }
      this.busy = true
      try {
        await registerAccount({
          email: this.normalizedEmail,
          name: this.name,
          password: this.password,
          verificationCode: this.code
        })
        this.password = ''
        this.confirmation = ''
        this.code = ''
        this.registered = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.busy = false
      }
    },
    enterWorkspace() {
      const redirect = this.$route.query.redirect
      this.$router.replace(
        typeof redirect === 'string' && redirect.startsWith('/app/') ? redirect : '/app/overview'
      )
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 注册页布局和表单状态；所有业务样式保留在本组件。 */
.register-page {
  min-height: 100dvh;
  background: radial-gradient(ellipse at 22% 38%, #0a3050, @bg 68%);
}
.register-layout {
  max-width: 1260px;
  margin: 20px auto 0;
  padding: 12px 5% 60px;
  display: grid;
  grid-template-columns: 1fr 460px;
  gap: 65px;
  align-items: center;
}
.register-art {
  min-width: 0;
  h1 {
    font-size: clamp(25px, 2.5vw, 34px);
    margin: 0 0 14px;
  }
  > p {
    color: @muted;
    line-height: 1.9;
    font-size: 14px;
  }
  .book-stage {
    margin: -10px auto -25px;
  }
}
.register-steps {
  display: flex;
  justify-content: center;
  gap: 24px;
  list-style: none;
  padding: 0;
  margin: 0;
  color: #7599b3;
  font-size: 12px;
  li {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  span {
    border: 1px solid #28516a;
    padding: 5px 7px;
    border-radius: 5px;
    font-size: 10px;
  }
  .complete {
    color: #9cecff;
    span {
      border-color: #2293b3;
      background: #0d3b50;
    }
  }
}
.register-card {
  padding: 30px 32px;
  h2 {
    font-size: 27px;
    margin: 0 0 10px;
  }
  > .eyebrow {
    font-size: 11px;
    color: #6ea9ce;
    margin-bottom: 10px;
  }
  .field-label {
    margin-top: 15px;
    font-size: 13px;
  }
  .input,
  .input-with-icon {
    min-height: 44px;
  }
  .register-intro {
    color: @muted;
    font-size: 12px;
    margin: 0 0 20px;
  }
}
.code-row {
  display: flex;
  gap: 10px;
}
.code-input {
  min-width: 0;
  flex: 1;
  letter-spacing: 3px;
  &::placeholder {
    letter-spacing: 0;
  }
}
.code-send {
  flex: 0 0 126px;
  padding: 8px;
  font-size: 12px;
}
.field-hint {
  font-size: 11px;
  color: #789bb4;
  line-height: 1.6;
  margin: 8px 0 0;
}
.hint-sent {
  color: #81d7d9;
}
.password-checks {
  display: flex;
  gap: 18px;
  margin: 11px 0 0;
  color: #7f9eb5;
  font-size: 11px;
  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #547087;
  }
  .valid {
    color: #89dbcf;
    i {
      background: #6bd2bd;
    }
  }
}
.register-submit {
  margin-top: 24px;
}
.register-footer {
  text-align: center;
  font-size: 12px;
  color: @muted;
  margin: 19px 0 0;
  a {
    color: #6edcff;
    margin-left: 6px;
  }
}
.register-success {
  text-align: center;
  padding: 25px 0;
  .success-icon {
    display: grid;
    place-items: center;
    width: 70px;
    height: 70px;
    margin: 0 auto 25px;
    color: #94f6e5;
    background: #12443f;
    border: 1px solid #387c70;
    border-radius: 50%;
  }
  .eyebrow {
    color: #89dbcf;
  }
  p {
    line-height: 1.9;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .button {
    margin-top: 20px;
  }
}
@media (max-width: 1000px) {
  .register-layout {
    grid-template-columns: 1fr 420px;
    gap: 25px;
    padding-inline: 4%;
  }
  .register-steps {
    gap: 12px;
  }
}
@media (max-width: 767px) {
  .register-layout {
    display: block;
    max-width: 500px;
    padding: 8px 18px 35px;
    margin: 0 auto;
  }
  .register-art {
    text-align: center;
    h1 {
      font-size: 23px;
    }
    > p {
      font-size: 12px;
      margin-bottom: 20px;
    }
    > .eyebrow,
    .book-stage,
    .register-steps {
      display: none;
    }
  }
  .register-card {
    padding: 24px 20px;
    h2 {
      font-size: 24px;
    }
  }
  .code-send {
    flex-basis: 112px;
  }
}
</style>
