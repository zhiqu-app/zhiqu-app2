<template>
  <div class="notification-center" @keydown.esc.stop.prevent="close">
    <button ref="trigger" class="icon-button notification-trigger" aria-label="学习提醒" :aria-expanded="String(open)"
      @click="toggle">
      <span ref="bell" class="notification-bell" :class="{ 'is-ringing': bellRinging }" @animationend="stopBell">
        <AppIcon name="bell" />
      </span><i v-if="feed.unreadCount" class="notification-unread" aria-hidden="true" /><span v-if="feed.unreadCount"
        class="sr-only">{{ feed.unreadCount }} 条未读</span>
    </button>
    <section v-if="open" class="notification-center-panel" aria-label="学习提醒记录">
      <header>
        <div>
          <h2>学习提醒</h2>
          <span class="notification-connection">{{ connectionLabel }}</span>
        </div>
        <button class="icon-button" aria-label="关闭学习提醒" @click="close">
          <AppIcon name="close" :size="17" />
        </button>
      </header>
      <div class="notification-toolbar">
        <button class="text-button" :disabled="feed.loading || !feed.unreadCount" @click="readAll">
          全部已读</button><button class="text-button" :disabled="feed.loading || !account" @click="reload">
          刷新记录
        </button>
      </div>
      <div class="notification-filters" role="group" aria-label="提醒筛选">
        <button v-for="item in filters" :key="item.key" :aria-pressed="filter === item.key" @click="filter = item.key">
          {{ item.label }}
        </button>
      </div>
      <p v-if="!account" class="notification-empty">
        登录账号后可查看计划提醒和完成记录。
      </p>
      <p v-else-if="feed.error" class="error-message" role="alert">
        {{ feed.error }}
      </p>
      <p v-if="feed.loading && !feed.items.length" class="notification-empty" role="status">
        正在读取提醒…
      </p>
      <ul v-if="filtered.length" class="notification-list">
        <li v-for="item in filtered" :key="item.id" class="notification-item" :class="{ unread: !item.read }">
          <div class="notification-item-icon">
            <AppIcon :name="item.taskDone || item.kind === 'completed' ? 'check' : 'clock'
              " :size="18" />
          </div>
          <div class="notification-item-content">
            <h3>{{ item.title }}</h3>
            <p>{{ item.body }}</p>
            <div class="notification-meta">
              <time>{{ dateLabel(item.createdAt) }}</time><span :class="{ complete: item.taskDone }">{{
                item.taskDone ? "已完成" : "待完成"
              }}</span>
            </div>
            <div class="notification-item-actions">
              <button class="text-button" @click="openTask(item)">
                {{ item.taskDone ? "查看完成任务" : "查看任务" }}</button><button v-if="!item.read" class="text-button"
                @click="read(item.id)">
                标为已读
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else-if="account && !feed.loading && !feed.error" class="notification-empty">
        {{
          filter === "completed"
            ? "完成计划后，会在这里留下记录。"
            : "暂时没有提醒，给复习计划设置提醒时间吧。"
        }}
      </p>
      <button v-if="feed.items.length < feed.total" class="notification-more text-button" :disabled="feed.loading"
        @click="more">
        加载更多记录
      </button>
      <footer>提醒按计划时间发送；关闭实时提醒后仍可查看历史。</footer>
    </section>
  </div>
</template>
<script>
import { state } from "../store";
import { accountScope } from "../services/courses";
import { motionAllowed } from "../utils/motion";
import {
  notificationState,
  startNotifications,
  stopNotifications,
  refreshNotifications,
  readNotification,
  readAllNotifications,
} from "../services/notifications";
export default {
  name: "NotificationCenter",
  data: () => ({
    feed: notificationState,
    open: false,
    bellRinging: false,
    filter: "all",
    filters: [
      { key: "all", label: "全部提醒" },
      { key: "pending", label: "待办提醒" },
      { key: "completed", label: "完成记录" },
    ],
  }),
  computed: {
    allowMotion() {
      return motionAllowed();
    },
    account() {
      return state.mode === "account" && !!state.account;
    },
    identity() {
      return accountScope();
    },
    live() {
      return state.settings.reminders;
    },
    filtered() {
      return this.feed.items.filter(
        (item) =>
          this.filter === "all" ||
          (this.filter === "completed"
            ? item.kind === "completed" || item.taskDone
            : item.kind === "due" && !item.taskDone),
      );
    },
    connectionLabel() {
      return !this.account
        ? "账号提醒"
        : {
          connected: "实时已连接",
          muted: "实时提醒已关闭",
          connecting: "正在连接实时提醒…",
          reconnecting: "连接中断，正在重连…",
          unavailable: "实时连接不可用",
          offline: "实时未连接",
        }[this.feed.connection] || "实时未连接";
    },
  },
  watch: {
    identity() {
      this._seenNotifications = new Set();
      this._newestNotification = 0;
      this.stopBell();
      startNotifications(this.live);
    },
    live() {
      this.stopBell();
      startNotifications(this.live);
    },
    allowMotion(value) {
      if (!value) this.stopBell();
    },
    "feed.items"(items) {
      const seen =
        this._seenNotifications || (this._seenNotifications = new Set());
      const previousNewest = this._newestNotification || 0;
      let hasNewUnread = false;
      items.forEach((item, index) => {
        const timestamp = Date.parse(item.createdAt);
        // 旧页加载、重复拉取及重连同一条提醒不重播；仅首批未读或新的未读记录触发。
        if (
          !seen.has(item.id) &&
          !item.read &&
          (Number.isFinite(timestamp)
            ? timestamp >= previousNewest
            : index === 0)
        )
          hasNewUnread = true;
        seen.add(item.id);
        if (Number.isFinite(timestamp))
          this._newestNotification = Math.max(
            this._newestNotification || 0,
            timestamp,
          );
      });
      if (hasNewUnread) this.ringBell();
    },
    "feed.unreadCount"(count) {
      if (!count) this.stopBell();
    },
  },
  mounted() {
    startNotifications(this.live);
    this._outside = (event) => {
      if (!this.$el.contains(event.target)) this.open = false;
    };
    document.addEventListener("pointerdown", this._outside);
  },
  beforeDestroy() {
    this.stopBell();
    stopNotifications();
    document.removeEventListener("pointerdown", this._outside);
  },
  methods: {
    stopBell() {
      clearTimeout(this._bellTimer);
      this._bellRun = (this._bellRun || 0) + 1;
      this.bellRinging = false;
    },
    async ringBell() {
      this.stopBell();
      const run = this._bellRun;
      await this.$nextTick();
      if (
        this._isDestroyed ||
        run !== this._bellRun ||
        !this.account ||
        !this.live ||
        !this.allowMotion ||
        this.open
      )
        return;
      // 读取布局使上一轮移除动画生效，新消息才能重新播放完整的 30 秒。
      this.$refs.bell?.getBoundingClientRect();
      this.bellRinging = true;
      this._bellTimer = setTimeout(() => this.stopBell(), 30000);
    },
    toggle() {
      this.open = !this.open;
      if (this.open) this.stopBell();
      if (this.open && this.account) this.reload();
    },
    close() {
      this.open = false;
      this.$refs.trigger?.focus();
    },
    reload() {
      return refreshNotifications();
    },
    more() {
      return refreshNotifications(true);
    },
    read(id) {
      return readNotification(id);
    },
    readAll() {
      return readAllNotifications();
    },
    async openTask(item) {
      if (!item.read) await this.read(item.id);
      this.close();
      const target =
        typeof item.target === "string" && item.target.startsWith("/app/")
          ? item.target
          : "/app/plan";
      this.$router.push(target).catch(() => { });
    },
    dateLabel(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
    },
  },
};
</script>
<style lang="less" scoped>
@import "../styles/tokens.less";

.notification-center {
  position: relative;
}

.notification-trigger {
  position: relative;

  .notification-unread {
    position: absolute;
    top: 4px;
    right: 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ff6a75;
  }
}

.notification-bell {
  display: inline-flex;
  transform-origin: 50% 12%;

  &.is-ringing {
    animation: notification-bell-swing 0.75s ease-in-out 40;
  }
}

@keyframes notification-bell-swing {

  0%,
  100% {
    transform: rotate(0);
  }

  12% {
    transform: rotate(-18deg);
  }

  26% {
    transform: rotate(15deg);
  }

  42% {
    transform: rotate(-12deg);
  }

  58% {
    transform: rotate(9deg);
  }

  74% {
    transform: rotate(-5deg);
  }

  88% {
    transform: rotate(3deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .notification-bell.is-ringing {
    animation: none;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.notification-center-panel {
  position: absolute;
  top: calc(100% + 16px);
  right: 0;
  z-index: 65;
  width: 390px;
  max-height: min(650px, calc(100dvh - 110px));
  overflow-y: auto;
  border: 1px solid #2c556c;
  border-radius: 12px;
  background: #081e30;
  box-shadow: 0 18px 65px #010b16aa;
  text-align: left;

  >header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 18px 12px;

    h2 {
      margin: 0 0 7px;
      font-size: 18px;
    }
  }

  >footer {
    padding: 12px 18px;
    border-top: 1px solid @border;
    font-size: 10px;
    line-height: 1.8;
    color: #7398b1;
  }

  >.error-message {
    margin: 12px 18px;
  }
}

.notification-connection {
  font-size: 10px;
  color: #82b4c9;
}

.notification-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 0 18px 14px;

  button {
    font-size: 11px;
  }
}

.notification-filters {
  display: flex;
  gap: 5px;
  padding: 0 14px 12px;

  button {
    flex: 1;
    padding: 8px 5px;
    font-size: 11px;
    border: 1px solid transparent;
    border-radius: 5px;
    color: @muted;

    &[aria-pressed="true"] {
      color: #8ae5f9;
      border-color: #32627a;
      background: #13344a;
    }
  }
}

.notification-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 15px 18px;
  border-top: 1px solid #18394f;

  &.unread {
    background: #0e2c42;
  }
}

.notification-item-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #316276;
  border-radius: 8px;
  color: #63cfdf;
}

.notification-item-content {
  min-width: 0;
  flex: 1;

  h3 {
    margin: 0 0 7px;
    font-size: 13px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  >p {
    color: #9cbbd0;
    margin: 0;
    font-size: 12px;
    line-height: 1.8;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}

.notification-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
  font-size: 10px;
  color: #799db7;

  .complete {
    color: #6dc7b4;
  }
}

.notification-item-actions {
  display: flex;
  gap: 20px;
  margin-top: 12px;

  button {
    font-size: 10px;
  }
}

.notification-empty {
  padding: 24px 18px;
  font-size: 12px;
  line-height: 1.9;
  color: @muted;
}

.notification-more {
  display: block;
  padding: 15px;
  width: 100%;
  font-size: 12px;
}

@media (max-width: 767px) {
  .notification-trigger {
    width: 35px;
  }

  .notification-center-panel {
    position: fixed;
    top: 74px;
    left: 14px;
    right: 14px;
    width: auto;
    max-height: calc(100dvh - 105px);
  }
}
</style>
