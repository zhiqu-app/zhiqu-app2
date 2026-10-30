<template>
  <footer class="public-footer">
    <slot />
  </footer>
</template>
<script>
export default { name: 'PublicFooter' }
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.public-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 4.5%;
  color: #83a8c8;
  font-size: 12px;
}

@media (max-width: 767px) {
  .public-footer {
    padding: 20px;
    flex-wrap: wrap;
    font-size: 10px;
    gap: 15px;

    .brand {
      display: none;
    }
  }
}
</style>
