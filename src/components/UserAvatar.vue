<template>
  <span class="user-avatar" :style="{ width: size + 'px', height: size + 'px' }" role="img" :aria-label="name + '的头像'">
    <img v-if="src && !failed" :src="src" alt="" @error="failed = true" />
    <svg v-else viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#A8D8FF" />
      <path d="M6 48c0-12 6-19 18-19s18 7 18 19" fill="#203B5A" />
      <path d="M19 27h10v9l-5 4-5-4" fill="#E9B79D" />
      <ellipse cx="24" cy="21" rx="10" ry="13" fill="#FFD6B7" />
      <path d="M14 23C9 10 17 7 22 7c10-2 16 7 12 18l-3-12c-3 5-9 5-14 3l-3 7Z" fill="#10263E" />
    </svg>
  </span>
</template>
<script>
export default {
  name: 'UserAvatar',
  props: {
    src: { type: String, default: '' },
    name: { type: String, default: '同学' },
    size: { type: Number, default: 44 }
  },
  data: () => ({ failed: false }),
  watch: {
    src() {
      this.failed = false
    }
  }
}
</script>
<style lang="less" scoped>
.user-avatar {
  flex: none;
  display: inline-flex;
  border-radius: 50%;
  overflow: hidden;
  background: #a8d8ff;
  vertical-align: middle;

  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
