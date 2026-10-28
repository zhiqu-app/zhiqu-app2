<template>
  <div
    class="workspace"
    :class="{ 'menu-open': menuOpen, immersive: $route.name === 'practice' }"
    @keydown.esc="closeMenu"
  >
    <div v-if="menuOpen" class="menu-shade" @click="menuOpen = false" />
    <div
      ref="sidebar"
      class="sidebar-container"
      :inert="narrow && !menuOpen ? '' : null"
      @keydown.tab="trapMenu"
    >
      <button
        v-if="narrow && menuOpen"
        class="icon-button drawer-close"
        aria-label="关闭导航"
        @click="closeMenu"
      >
        <AppIcon name="close" :size="20" />
      </button>
      <SideMenu :user="state.settings" @navigate="menuOpen = false" />
    </div>
    <div class="workspace-body" :inert="narrow && menuOpen ? '' : null">
      <header class="topbar">
        <div class="topbar-title">
          <button
            class="icon-button"
            ref="menuButton"
            :aria-expanded="String(menuOpen)"
            aria-label="打开或关闭导航"
            @click="menuOpen = !menuOpen"
          >
            <AppIcon name="menu" />
          </button>
          <span
            >学习空间
            <em>/</em>
            <strong>{{ $route.meta.title }}</strong>
          </span>
        </div>
        <form class="top-search" @submit.prevent="search">
          <AppIcon name="search" :size="19" />
          <input
            v-model.trim="searchText"
            aria-label="搜索课程"
            placeholder="搜索课程、资料或知识点"
          />
        </form>
        <NotificationCenter />
        <router-link to="/app/settings" aria-label="打开个人设置">
          <UserAvatar :name="state.settings.name" :size="34" />
        </router-link>
      </header>
      <div class="demo-banner">
        <span><i class="dot cyan" /> 账号已登录</span>
        <span>课程、资料、题库、星图与问答由后端提供</span>
        <router-link to="/welcome">产品首页</router-link>
      </div>
      <p v-if="state.storageError" class="error-message" role="alert">
        浏览器无法保存界面偏好，学习数据以服务器为准。
      </p>
      <main
        class="workspace-content"
        :aria-busy="navigation.pending ? 'true' : 'false'"
        :inert="
          navigation.overlayVisible || navigation.overlayLeaving ? '' : null
        "
      >
        <transition
          name="page-view"
          mode="out-in"
          :css="allowMotion"
          @after-enter="workspaceReady"
        >
          <router-view
            :key="$route.path"
            v-page-reveal
            class="route-page"
            :data-route-path="$route.fullPath"
          />
        </transition>
      </main>
    </div>
    <nav
      class="mobile-nav"
      aria-label="手机主导航"
      :inert="menuOpen ? '' : null"
    >
      <router-link
        v-for="item in mobileItems"
        :key="item.path"
        :to="item.path"
        :class="{ active: isActive(item.key) }"
      >
        <AppIcon :name="item.icon" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>
<script>
import SideMenu from "../components/SideMenu.vue";
import UserAvatar from "../components/UserAvatar.vue";
import NotificationCenter from "../components/NotificationCenter.vue";
import { state, notify } from "../store";
import { navigation, revealPage } from "../utils/navigation";
import { motionAllowed } from "../utils/motion";
export default {
  name: "Workspace",
  components: { SideMenu, UserAvatar, NotificationCenter },
  data: () => ({
    state,
    navigation,
    menuOpen: false,
    narrow: window.innerWidth < 1200,
    searchText: "",
    mobileItems: [
      { key: "overview", path: "/app/overview", label: "总览", icon: "home" },
      { key: "courses", path: "/app/courses", label: "课程", icon: "book" },
      { key: "studio", path: "/app/studio", label: "研习室", icon: "graph" },
      { key: "practice", path: "/app/practice", label: "练习", icon: "edit" },
      {
        key: "settings",
        path: "/app/settings",
        label: "我的",
        icon: "settings",
      },
    ],
  }),
  computed: {
    allowMotion() {
      return motionAllowed();
    },
  },
  mounted() {
    this.onResize = () => {
      this.narrow = window.innerWidth < 1200;
      if (!this.narrow) this.menuOpen = false;
    };
    window.addEventListener("resize", this.onResize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onResize);
    document.body.style.overflow = "";
  },
  methods: {
    notify,
    workspaceReady(element) {
      revealPage(element.dataset.routePath, "workspace");
    },
    closeMenu() {
      this.menuOpen = false;
      this.$nextTick(() => {
        if (this.$refs.menuButton) this.$refs.menuButton.focus();
      });
    },
    trapMenu(event) {
      if (!this.menuOpen || !this.narrow) return;
      const elements = this.$refs.sidebar.querySelectorAll("a[href], button");
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    isActive(key) {
      return (
        key === this.$route.name ||
        (key === "courses" && this.$route.name === "course") ||
        (key === "practice" && this.$route.name === "mistakes")
      );
    },
    search() {
      if (
        this.$route.name === "courses" &&
        this.$route.query.q === this.searchText
      )
        return;
      this.$router.push({
        path: "/app/courses",
        query: { q: this.searchText },
      });
    },
  },
  watch: {
    menuOpen(open) {
      document.body.style.overflow = open && this.narrow ? "hidden" : "";
      if (open && this.narrow)
        this.$nextTick(() => {
          const first = this.$refs.sidebar.querySelector("button");
          if (first) first.focus();
        });
    },
    $route() {
      this.menuOpen = false;
    },
  },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

.drawer-close {
  position: absolute;
  top: 2px;
  right: 4px;
  z-index: 1;
}
.workspace {
  min-height: 100dvh;
  background: @bg url("/assets/workspace.png") center top / cover fixed;
}
.sidebar-container {
  position: fixed;
  z-index: 35;
  inset: 0 auto 0 0;
  width: 236px;
}
.workspace-body {
  margin-left: 236px;
  min-height: 100dvh;
}
.topbar {
  height: 64px;
  background: #092032bc;
  border-bottom: 1px solid #122d42;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 26px;
  .topbar-title {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    font-size: 14px;
    color: #a5c8e7;
    em {
      font-style: normal;
      padding: 0 10px;
      color: #468bb8;
    }
    strong {
      color: #e6f2ff;
      font-weight: 500;
    }
    .icon-button {
      display: none;
    }
  }
}
.top-search {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #39729a;
  border-radius: 22px;
  padding: 6px 14px;
  width: 300px;
  input {
    background: none;
    border: 0;
    outline: 0;
    width: 100%;
    color: #c4dcef;
    font-size: 12px;
  }
}
.demo-banner {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 28px;
  color: #7da5c7;
  background: #071c2c;
  font-size: 10px;
  > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #a0c1db;
  }
  a {
    margin-left: auto;
    color: #5eabdc;
  }
}
.workspace-content {
  padding: 26px 28px 48px;
  max-width: 1800px;
  margin: 0 auto;
}
.mobile-nav,
.menu-shade {
  display: none;
}
@media (min-width: 1600px) {
  .workspace-content {
    padding: 32px;
  }
}
@media (max-width: 1390px) and (min-width: 1200px) {
  .sidebar-container {
    width: 215px;
  }
  .workspace-body {
    margin-left: 215px;
  }
  .workspace-content {
    padding: 23px 20px 40px;
  }
}
@media (max-width: 1199px) {
  .sidebar-container {
    transform: translateX(-100%);
    transition: transform 0.22s;
    z-index: 60;
    width: 236px;
  }
  .workspace-body {
    margin-left: 0;
  }
  .menu-open {
    .sidebar-container {
      transform: translateX(0);
    }
    .menu-shade {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 55;
      background: #010b15b8;
    }
  }
  .topbar .topbar-title .icon-button {
    display: inline-flex;
  }
}
@media (max-width: 767px) {
  .topbar {
    height: 58px;
    padding: 0 12px;
    gap: 7px;
    .topbar-title {
      gap: 2px;
      font-size: 14px;
      > span {
        color: transparent;
        font-size: 0;
        em {
          display: none;
        }
        strong {
          font-size: 14px;
          color: #d8eaff;
        }
      }
    }
  }
  .top-search {
    display: none;
  }
  .demo-banner {
    padding: 5px 16px;
    font-size: 9px;
    gap: 10px;
    > span:nth-child(2) {
      display: none;
    }
  }
  .workspace-content {
    padding: 22px 15px calc(90px + env(safe-area-inset-bottom));
  }
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    border-top: 1px solid #1e465e;
    background: #071d2ff5;
    backdrop-filter: blur(18px);
    padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
    > a {
      flex: 1;
      min-height: 46px;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      color: #7ea4c4;
      font-size: 10px;
      &.active {
        color: #39d7ff;
        .app-icon {
          filter: drop-shadow(0 0 6px #00b5ff60);
        }
      }
    }
  }
  .workspace.immersive {
    .mobile-nav {
      display: none;
    }
    .workspace-content {
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
  }
}
.page-view-enter-active {
  transition:
    opacity 0.28s ease-out,
    transform 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
}
.page-view-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
  pointer-events: none;
}
.page-view-enter {
  opacity: 0;
  transform: translateY(9px);
}
.page-view-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.route-page {
  min-width: 0;
}

@media (max-width: 767px) {
  .page-view-enter {
    transform: translateY(6px);
  }
}
</style>
