<template>
  <aside class="side-menu" aria-label="主导航">
    <header class="side-menu__top"><BrandLogo /></header>
    <nav class="side-menu__middle">
        <router-link
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            class="menu-link"
            :class="{ selected: active(item.key) }"
            :aria-current="active(item.key) ? 'page' : null"
            @click.native="$emit('navigate')"
            >
            <AppIcon :name="item.icon" :size="25" />
            <span>{{ item.label }}</span>
        </router-link>
    </nav>
    <footer class="side-menu__bottom">
        <router-link to="/app/settings" class="profile-link" @click.native="$emit('navigate')">
            <UserAvatar :name="user.name" :size="42" />
            <span>
                <strong>{{ user.name }}</strong>
                <small>{{ user.grade }} · {{ user.major }}</small>
            </span>
        </router-link>
        <router-link
            to="/app/settings"
            class="icon-button"
            aria-label="个人设置"
            :class="{ selected: $route.name === 'settings' }"
            @click.native="$emit('navigate')">
            <AppIcon name="settings" :size="20"/>
        </router-link>
    </footer>
  </aside>
</template>
<script>
import BrandLogo from './BrandLogo.vue'
import UserAvatar from './UserAvatar.vue'
export default {
  name: 'SideMenu',
  components: { BrandLogo, UserAvatar },
  props: { user: { type: Object, required: true } },
  data: () => ({
    items: [
      { key: 'overview', path: '/app/overview', label: '学习总览', icon: 'home' },
      { key: 'courses', path: '/app/courses', label: '我的课程', icon: 'book' },
      { key: 'studio', path: '/app/studio', label: 'AI 研习室', icon: 'graph' },
      { key: 'knowledge', path: '/app/knowledge', label: '知识路线', icon: 'graph' },
      { key: 'practice', path: '/app/practice', label: '练习与错题', icon: 'edit' },
      { key: 'reports', path: '/app/reports', label: '学习报告', icon: 'chart' },
      { key: 'plan', path: '/app/plan', label: '复习计划', icon: 'calendar' }
    ]
  }),
  methods: {
    active(key) {
      return (
        key === this.$route.name ||
        (key === 'courses' && this.$route.name === 'course') ||
        (key === 'practice' && this.$route.name === 'mistakes')
      )
    }
  }
}
</script>
<style lang="less" scoped>
.side-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(155deg, #081e30, #061827 70%);
  border-right: 1px solid #17374d;
}
.side-menu__top {
  padding: 28px 24px 38px;
  flex-shrink: 0;
}
.side-menu__middle {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px;
}
.menu-link {
  height: 54px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 0 22px;
  border-radius: 6px;
  color: #a9cbea;
  font-size: 17px;
  border-left: 2px solid transparent;
  text-decoration: none;
  &:hover {
    background: #102e48;
    color: white;
  }
  &.selected {
    background: linear-gradient(90deg, #103e61, #163354);
    border-color: #14daff;
    color: #fff;
    font-weight: 600;
    .app-icon {
      color: #2cdaff;
      filter: drop-shadow(0 0 5px #00aaff);
    }
  }
}
.side-menu__bottom {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 24px 16px 28px;
  .profile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    text-decoration: none;
    > span:last-child {
      min-width: 0;
    }
    strong {
      color: #edf5ff;
      display: block;
      font-size: 14px;
    }
    small {
      display: block;
      color: #9bbede;
      font-size: 11px;
      margin-top: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 112px;
    }
  }
  .selected {
    color: #1ed6ff;
  }
}

/* 本组件的布局、状态、动效与响应式样式。 */

.menu-link {
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
}
</style>
