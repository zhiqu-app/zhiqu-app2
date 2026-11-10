<template>
  <main class="recovery-page">
    <PublicHeader>
      <BrandLogo />
      <router-link :to="loginRoute" class="text-button">
        返回登录 <AppIcon name="arrow" :size="16" />
      </router-link>
    </PublicHeader>

    <div class="recovery-layout">
      <section class="recovery-art" aria-label="账号恢复流程">
        <span class="eyebrow">知序 · 你的学习空间</span>
        <p class="recovery-art-title">恢复访问，继续你的学习</p>
        <p class="recovery-art-description">通过邮箱确认身份，回到你的课程、练习与复习计划。</p>
        <BookStage :state="artState" />
        <ol class="recovery-steps">
          <li v-for="(step, index) in steps" :key="step"
            :class="{ current: currentStep === index, complete: completed && index < 2 }"
            :aria-current="currentStep === index ? 'step' : null">
            <span aria-hidden="true">0{{ index + 1 }}</span>{{ step }}
          </li>
        </ol>
      </section>

      <section class="panel recovery-card" :class="{ 'recovery-complete': completed }" aria-labelledby="recovery-title">
        <span v-if="completed" class="recovery-success-icon" aria-hidden="true"><AppIcon name="check" :size="28" /></span>
        <span class="eyebrow">{{ completed ? '账号恢复完成' : '使用邮箱恢复账号' }}</span>
        <h1 id="recovery-title" ref="title" tabindex="-1">
          {{ completed ? '密码已重置' : '找回密码' }}
        </h1>
        <template v-if="completed">
          <p class="muted" role="status">请使用新密码重新登录。原有登录会话已失效。</p>
          <router-link :to="loginRoute" class="button primary full-width recovery-submit">去登录</router-link>
        </template>

        <template v-else>
          <p class="muted">填写注册时验证过的邮箱，获取密码重置验证码。</p>
          <form novalidate @submit.prevent="submit">
            <label for="recovery-email" class="field-label">登录邮箱</label>
            <div class="input-with-icon" :class="{ focused: focused === 'email' }">
              <AppIcon name="mail" :size="18" />
              <input id="recovery-email" v-model.trim="email" type="email" autocomplete="email"
                maxlength="100" placeholder="输入已验证的登录邮箱" :disabled="sending || busy"
                @focus="focused = 'email'" @blur="focused = ''" />
            </div>

            <label for="recovery-code" class="field-label">邮箱验证码</label>
            <div class="recovery-code-row">
              <input id="recovery-code" ref="code" v-model.trim="code" class="input" inputmode="numeric"
                autocomplete="one-time-code" maxlength="6" placeholder="6 位数字" :disabled="busy || sending"
                @focus="focused = 'code'" @blur="focused = ''" />
              <button type="button" class="button secondary" :disabled="!validEmail || sending || busy || remaining > 0"
                @click="sendCode">
                {{ sending ? '正在提交…' : remaining > 0 ? `${remaining}s 后重发` : sent ? '重新发送' : '获取验证码' }}
              </button>
            </div>
            <p v-if="sent" class="recovery-hint" role="status">{{ delivery.message }} 验证码 {{ validityMinutes }} 分钟内有效。</p>
            <p v-else class="recovery-hint">收到邮件后填写 6 位验证码，未收到时可检查垃圾邮件。</p>

            <label for="recovery-password" class="field-label">新密码</label>
            <div class="input-with-icon" :class="{ focused: focused === 'password' }">
              <AppIcon name="lock" :size="18" />
              <input id="recovery-password" v-model="password" :type="visible ? 'text' : 'password'"
                autocomplete="new-password" maxlength="128" placeholder="8～128 位密码" :disabled="busy"
                @focus="focused = 'password'" @blur="focused = ''" />
              <button type="button" class="icon-button" :aria-label="visible ? '隐藏密码' : '显示密码'"
                :aria-pressed="String(visible)" @mousedown.prevent @click="visible = !visible">
                <AppIcon :name="visible ? 'eye-off' : 'eye'" :size="18" />
              </button>
            </div>

            <label for="recovery-confirm" class="field-label">确认新密码</label>
            <input id="recovery-confirm" v-model="confirmation" class="input" :type="visible ? 'text' : 'password'"
              autocomplete="new-password" maxlength="128" placeholder="再次输入新密码" :disabled="busy"
              @focus="focused = 'confirm'" @blur="focused = ''" />

            <p v-if="error" class="error-message" role="alert">{{ error }}</p>
            <button type="submit" class="button primary full-width recovery-submit" :disabled="busy || sending">
              {{ busy ? '正在重置…' : '重置密码' }}
              <AppIcon name="arrow" :size="18" />
            </button>
          </form>
        </template>
      </section>
    </div>
  </main>
</template>

<script>
import PublicHeader from '../components/PublicHeader.vue';
import BrandLogo from '../components/BrandLogo.vue';
import BookStage from '../components/BookStage.vue';
import { api } from '../services/api';
import { resetAccountPassword } from '../services/auth';

export default {
  name: 'ForgotPassword',
  components: { PublicHeader, BrandLogo, BookStage },
  data: () => ({
    email: '', code: '', password: '', confirmation: '', visible: false,
    sending: false, busy: false, completed: false, error: '', delivery: null,
    cooldowns: {}, now: Date.now(),
    focused: '', steps: ['验证邮箱', '设置新密码', '重新登录'],
  }),
  computed: {
    normalizedEmail() {
      return this.email.toLowerCase();
    },
    validEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.normalizedEmail);
    },
    remaining() {
      const deadline = this.cooldowns[this.normalizedEmail] || 0;
      return Math.max(0, Math.ceil((deadline - this.now) / 1000));
    },
    sent() {
      return this.delivery?.email === this.normalizedEmail;
    },
    validityMinutes() {
      return Math.ceil(this.delivery.expiresIn / 60);
    },
    currentStep() {
      if (this.completed) return 2;
      return ['password', 'confirm'].includes(this.focused) || /^[0-9]{6}$/.test(this.code) ? 1 : 0;
    },
    artState() {
      if (this.completed) return 'ready';
      if (['email', 'code'].includes(this.focused)) return 'email';
      if (['password', 'confirm'].includes(this.focused)) return this.visible ? 'reveal' : 'password';
      return 'idle';
    },
    loginRoute() {
      const redirect = this.$route.query.redirect;
      return {
        path: '/login',
        query: typeof redirect === 'string' && redirect.startsWith('/app/') ? { redirect } : {},
      };
    },
  },
  watch: {
    normalizedEmail() {
      this.code = '';
      this.error = '';
    },
  },
  mounted() {
    this.clock = setInterval(() => { this.now = Date.now(); }, 500);
  },
  beforeDestroy() {
    clearInterval(this.clock);
  },
  methods: {
    setCooldown(email, seconds) {
      this.now = Date.now();
      this.$set(this.cooldowns, email, this.now + seconds * 1000);
    },
    async sendCode() {
      if (!this.validEmail || this.sending || this.busy || this.remaining) return;
      const email = this.normalizedEmail;
      this.sending = true;
      this.error = '';
      try {
        const delivery = await api.sendPasswordResetCode(email);
        this.delivery = { ...delivery, email };
        this.code = '';
        this.setCooldown(email, delivery.resendAfter);
        this.$nextTick(() => this.$refs.code?.focus());
      } catch (error) {
        this.error = error.message;
        if (error.retryAfter) this.setCooldown(email, error.retryAfter);
      } finally {
        this.sending = false;
      }
    },
    async submit() {
      if (this.busy || this.sending) return;
      this.error = '';
      if (!this.validEmail) this.error = '请输入有效的邮箱地址。';
      else if (!/^[0-9]{6}$/.test(this.code)) this.error = '请输入邮件中的 6 位验证码。';
      else if (this.password.length < 8 || this.password.length > 128) this.error = '密码长度应为 8～128 位。';
      else if (this.password !== this.confirmation) this.error = '两次输入的密码不一致。';
      if (this.error) return;
      this.busy = true;
      try {
        await resetAccountPassword({
          email: this.normalizedEmail, verificationCode: this.code, password: this.password,
        });
        this.password = '';
        this.confirmation = '';
        this.code = '';
        this.completed = true;
        this.$nextTick(() => this.$refs.title?.focus());
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

.recovery-page {
  min-height: 100dvh;
  background: radial-gradient(ellipse at 22% 38%, #0a3050, @bg 68%);
}

.recovery-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
  align-items: center;
  gap: clamp(28px, 5vw, 65px);
  max-width: 1260px;
  margin: 20px auto 0;
  padding: 12px 5% 60px;
}

.recovery-art {
  min-width: 0;

  .book-stage { margin: -12px auto -16px; }
}

.recovery-art-title {
  margin: 8px 0 10px;
  font-size: clamp(24px, 2.5vw, 34px);
  font-weight: 700;
  line-height: 1.35;
}

.recovery-art-description {
  color: @muted;
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
}

.recovery-steps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 20px;
  list-style: none;
  margin: 0;
  padding: 0;
  color: @muted;
  font-size: 12px;

  li { display: flex; align-items: center; gap: 6px; }
  span { border: 1px solid #28516a; padding: 4px 6px; border-radius: 5px; font-size: 10px; }
  .current { color: #9cecff; }
  .current span { border-color: #2293b3; background: #0d3b50; }
  .complete span { color: #8edbcf; border-color: #307c80; }
}

.recovery-card {
  min-width: 0;
  padding: clamp(18px, 4vw, 32px);

  .eyebrow { color: #6ea9ce; font-size: 11px; }
  h1 { margin: 8px 0 10px; font-size: 28px; }
  .muted { margin: 0 0 20px; line-height: 1.7; }
  .field-label { margin-top: 15px; }
  .input, .input-with-icon, .button { min-height: 44px; }
}

.recovery-code-row {
  display: flex;
  gap: 8px;
  .input { flex: 1; min-width: 0; }
  .button { flex-shrink: 0; padding-inline: 10px; font-size: 12px; }
}

.recovery-hint { margin: 8px 0 0; color: @muted; font-size: 12px; line-height: 1.65; }
.recovery-submit { margin-top: 22px; }

.recovery-complete { text-align: center; }
.recovery-success-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border: 1px solid #287f8a;
  border-radius: 50%;
  color: #8edbcf;
  background: #0d3b50;
}

@media (max-width: 860px) {
  .recovery-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    max-width: 510px;
    margin-top: 8px;
    padding: 12px 16px 40px;
  }
  .recovery-art {
    text-align: center;
    .book-stage { max-width: 320px; max-height: 170px; margin: -8px auto -10px; }
  }
  .recovery-art-description { font-size: 13px; }
  .recovery-steps { gap: 8px 12px; font-size: 11px; }
}
</style>
