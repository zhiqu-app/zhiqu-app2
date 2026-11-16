<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>个人与设置</h1>
        <p>管理个人资料、账号学习数据与连接状态。</p>
      </div>
      <button class="button secondary" :disabled="busy" @click="logout">
        {{ "退出登录" }}
      </button>
    </header>
    <div class="tabs settings-tabs">
      <button class="active">基本资料</button><router-link to="/app/reports">学习报告</router-link><router-link
        to="/app/history">作答历史</router-link><router-link to="/app/plan">复习计划</router-link>
    </div>
    <p v-if="profileError" class="error-message" role="alert">
      {{ profileError }}
      <button class="text-button" @click="readProfile">重新读取资料</button>
    </p>
    <div class="settings-grid">
      <section class="panel">
        <h2>基本资料</h2>
        <p v-if="profileLoading" role="status">正在读取账号资料…</p>
        <form v-else @submit.prevent="save">
          <div class="profile-editor">
            <UserAvatar :src="avatarPreview" :name="form.name" :size="76" />
            <div class="profile-avatar-controls">
              <div class="profile-avatar-actions">
                <input ref="avatarFile" type="file" accept="image/jpeg,image/png,image/webp"
                  hidden :disabled="busy || avatarLoading" @change="selectAvatar" />
                <button type="button" class="button secondary" aria-describedby="avatar-help"
                  :disabled="busy || avatarLoading" @click="$refs.avatarFile.click()">
                  <AppIcon name="upload" :size="16" />{{ avatarLoading ? "正在处理…" : "更换头像" }}
                </button>
                <button v-if="avatarPreview" type="button" class="text-button"
                  :disabled="busy || avatarLoading" @click="resetAvatar">恢复默认</button>
              </div>
              <p id="avatar-help" class="small muted" aria-live="polite">{{
                avatarDraft === null ? "支持 JPG、PNG、WebP，最大 5 MB。" : "已预览头像，点击「保存资料」生效。"
              }}</p>
              <p v-if="avatarError" class="error-message" role="alert">{{ avatarError }}</p>
            </div>
          </div>
          <label class="field-label" for="user-name">昵称</label><input id="user-name" v-model.trim="form.name"
            class="input" required maxlength="30" :disabled="busy" /><label class="field-label"
            for="user-major">专业</label><input id="user-major" v-model.trim="form.major" class="input" maxlength="30"
            :disabled="busy" /><label class="field-label" for="user-grade">年级</label><select id="user-grade"
            v-model="form.grade" class="input" :disabled="busy">
            <option v-for="grade in grades" :key="grade">
              {{ grade }}
            </option>
          </select><label class="field-label" for="user-email">联系邮箱（选填）</label><input id="user-email"
            v-model.trim="form.email" class="input" type="email" maxlength="100" :disabled="busy" /><button
            class="button primary full-width settings-save" :disabled="busy || avatarLoading || !form.name">
            保存资料
          </button>
        </form>
      </section>
      <section class="panel">
        <h2>学习偏好</h2>
        <label class="preference-row">
          <AppIcon name="spark" /><span><strong>减少动态效果</strong><small>关闭浮动插画与转场运动</small></span><input
            v-model="form.reducedMotion" class="switch" type="checkbox" :disabled="busy || profileLoading"
            @change="savePreference" />
        </label><label class="preference-row">
          <AppIcon name="bell" /><span><strong>显示学习提醒</strong><small>仅控制应用内提醒</small></span><input
            v-model="form.reminders" class="switch" type="checkbox" :disabled="busy || profileLoading"
            @change="savePreference" />
        </label>
        <div class="settings-note">
          <AppIcon name="info" />
          <div>
            <h3>
              {{ "账号学习空间" }}
            </h3>
            <p>
              {{
                "课程、PDF 原文件、题库、作答与问答保存在账号中，重新登录后可以读取。"
              }}
            </p>
            <p>示例题库文件只在前端供下载或预览，不会自动导入你的课程。</p>
          </div>
        </div>
        <div class="preference-row">
          <span>
            <strong>
              {{
                healthStatus === "ok"
                  ? "服务已连接"
                  : healthStatus === "checking"
                    ? "正在检查连接"
                    : "服务连接失败"
              }}
            </strong>
            <small>
              {{
                healthError || "检查后端服务与数据库是否可用"
              }}
            </small>
          </span>
          <button class="text-button" @click="checkHealth">检查连接</button>
        </div>
      </section>
    </div>
    <section class="panel data-settings">
      <h2>数据管理</h2>
      <div class="preference-row">
        <AppIcon name="download" /><span><strong>导出学习数据</strong><small>{{
          "导出账号课程、资料文字、作答、计划和问答；不包含 PDF 原文件、题库和星图"
        }}</small></span><button class="button secondary small-button" :disabled="busy" @click="exportData">
          导出数据
        </button>
      </div>
      <div class="preference-row">
        <AppIcon name="trash" /><span><strong>{{ "清空账号学习数据" }}</strong><small>{{
          "删除账号中的课程及其 PDF、题库、作答、星图、问答和计划；保留登录账号与个人资料"
        }}</small></span><button class="button danger small-button" :disabled="busy" @click="
              confirmReset = true;
            confirmWord = '';
            resetError = '';
            ">
          {{ "清空账号数据" }}
        </button>
      </div>
    </section>
    <AppModal v-if="confirmReset" :title="'清空账号学习数据？'" @close="closeReset">
      <p>
        {{
          "这会删除账号中全部学习数据，包括已保存的 PDF 原文件。登录账号和个人资料会保留。"
        }}
      </p>
      <label v-if="state.mode === 'account'" class="field-label" for="reset-confirm">输入“清空”确认</label><input
        v-if="state.mode === 'account'" id="reset-confirm" v-model="confirmWord" class="input" autocomplete="off"
        :disabled="busy" />
      <p v-if="resetError" class="error-message" role="alert">
        {{ resetError }}
      </p>
      <div class="modal-actions">
        <button class="button secondary" :disabled="busy" @click="closeReset">
          取消</button><button class="button danger" :disabled="busy || (state.mode === 'account' && confirmWord !== '清空')
            " @click="reset">
          {{ busy ? "正在处理…" : "确认清空" }}
        </button>
      </div>
    </AppModal>
  </div>
</template>
<script>
import UserAvatar from "../components/UserAvatar.vue";
import AppModal from "../components/AppModal.vue";
import { state, persist, notify, resetData } from "../store";
import { logoutAccount } from "../services/auth";
import { api } from "../services/api";
import { accountScope, assertScope } from "../services/courses";
import {
  getProfile,
  getHealth,
  exportAccountData,
  resetAccountData,
  downloadJson,
} from "../services/platform";

async function prepareAvatar(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if (file.size > 5 * 1024 * 1024) throw new Error("头像图片不能超过 5 MB。");

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("图片无法读取，请换一张图片。"); });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#a8d8ff";
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, 256, 256);
    for (const quality of [0.88, 0.72, 0.56, 0.4]) {
      const avatar = canvas.toDataURL("image/jpeg", quality);
      if (avatar.startsWith("data:image/jpeg;base64,") && avatar.length <= 48 * 1024) return avatar;
    }
    throw new Error("图片压缩后仍然过大，请换一张图片。");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default {
  name: "Settings",
  components: { UserAvatar, AppModal },
  data: () => ({
    state,
    form: { ...state.settings },
    avatarDraft: null,
    avatarLoading: false,
    avatarError: "",
    grades: ["大一", "大二", "大三", "大四", "研究生", "其他"],
    busy: false,
    profileLoading: false,
    profileError: "",
    healthStatus: "checking",
    healthError: "",
    confirmReset: false,
    confirmWord: "",
    resetError: "",
  }),
  computed: {
    avatarPreview() {
      return this.avatarDraft ?? state.settings.avatar;
    },
  },
  created() {
    this.readProfile();
    this.checkHealth();
  },
  methods: {
    async selectAvatar(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || this.busy || this.avatarLoading) return;
      this.avatarLoading = true;
      this.avatarError = "";
      try {
        this.avatarDraft = await prepareAvatar(file);
      } catch (error) {
        this.avatarError = error.message;
      } finally {
        this.avatarLoading = false;
      }
    },
    resetAvatar() {
      this.avatarDraft = "";
      this.avatarError = "";
    },
    async readProfile() {
      if (state.mode !== "account") return;
      this.profileLoading = true;
      this.profileError = "";
      try {
        const profile = await getProfile();
        this.form = { ...profile };
        Object.assign(state.settings, profile);
        if (state.account) state.account.profile = { ...profile };
        persist();
      } catch (error) {
        this.profileError = error.message;
      } finally {
        this.profileLoading = false;
      }
    },
    async checkHealth() {
      this.healthStatus = "checking";
      this.healthError = "";
      try {
        const result = await getHealth();
        this.healthStatus = result.status === "ok" ? "ok" : "error";
      } catch (error) {
        this.healthStatus = "error";
        this.healthError = error.message;
      }
    },
    async save() {
      if (this.busy || this.avatarLoading || !this.form.name) return;
      this.busy = true;
      const scope = accountScope();
      try {
        const body = { ...this.form };
        delete body.avatar;
        if (this.avatarDraft !== null) body.avatar = this.avatarDraft;
        const profile = await api.saveProfile(body);
        assertScope(scope);
        Object.assign(state.settings, profile);
        if (state.account) state.account.profile = { ...profile };
        this.avatarDraft = null;
        persist();
        notify("个人资料已保存");
      } catch (error) {
        notify(error.details?.[0]?.message || error.message);
      } finally {
        this.busy = false;
      }
    },
    async savePreference() {
      const values = {
        reducedMotion: this.form.reducedMotion,
        reminders: this.form.reminders,
      };
      try {
        await api.saveProfile(values);
        Object.assign(state.settings, values);
        persist();
      } catch (error) {
        this.form.reducedMotion = state.settings.reducedMotion;
        this.form.reminders = state.settings.reminders;
        notify(error.message);
      }
    },
    async logout() {
      try {
        await logoutAccount();
      } catch (error) {
        notify(error.message);
      } finally {
        this.$router.replace("/login");
      }
    },
    async exportData() {
      if (this.busy) return;
      this.busy = true;
      try {
        const value = await exportAccountData();
        downloadJson(value, "知序-账号学习记录.json");
        notify("学习记录已导出");
      } catch (error) {
        notify(error.message);
      } finally {
        this.busy = false;
      }
    },
    closeReset() {
      if (!this.busy) this.confirmReset = false;
    },
    async reset() {
      if (this.busy) return;
      if (state.mode === "account" && this.confirmWord !== "清空") return;
      this.busy = true;
      this.resetError = "";
      try {
        await resetAccountData();
        resetData();
        this.confirmReset = false;
        notify("账号学习数据已清空");
      } catch (error) {
        this.resetError = error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.settings-tabs {
  margin-bottom: 20px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;

  >.panel {
    padding: 28px;
  }
}

.profile-editor {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 0 26px;
}

.profile-avatar-controls {
  min-width: 0;
  >p {
    margin: 8px 0 0;
  }
}

.profile-avatar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
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

  >.app-icon {
    color: #32c5ec;
  }

  >span {
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
    content: "";
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

    >.panel {
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

      >span {
        flex-basis: calc(100% - 40px);
      }

      >.button {
        margin-left: auto;
      }
    }
  }

  .settings-tabs {
    gap: 5px;

    >button,
    >a {
      font-size: 12px;
      padding: 8px 17px;
    }
  }
}
</style>
