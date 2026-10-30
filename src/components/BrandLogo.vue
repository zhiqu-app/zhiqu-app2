<template>
  <router-link to="/welcome" class="brand" aria-label="知序产品首页"><svg viewBox="0 0 58 48" fill="none" aria-hidden="true">
      <path d="m7 7 19 9v26L6 32 3 13M51 7l-19 9v26l20-10 3-19M9 3l20 10L49 3M10 13l13 6M48 13l-13 6"
        stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="brand-copy">
      <strong>知序</strong><small>AI 学习空间</small>
    </span>
  </router-link>
</template>
<script>
export default { name: 'BrandLogo' }
</script>
<style lang="less" scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #389cff;
  text-decoration: none;

  svg {
    width: 54px;
    height: 48px;
    flex: none;
  }

  strong {
    display: block;
    color: #edf5ff;
    font-size: 23px;
    letter-spacing: 3px;
  }

  small {
    display: block;
    color: #9cbdde;
    font-size: 12px;
    margin-top: 3px;
    letter-spacing: 1px;
  }
}
</style>
