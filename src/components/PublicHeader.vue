<template>
  <header class="public-header">
    <slot />
  </header>
</template>
<script>
export default { name: 'PublicHeader' }
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.public-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 4.5%;
  gap: 20px;
  min-height: 96px;
  position: relative;
  z-index: 2;
}

@media (max-width: 767px) {
  .public-header {
    padding: 20px;
    min-height: 80px;
    gap: 15px;

    // 插槽内 BrandLogo 的内部元素不属于页头作用域，仅在此调整手机尺寸。
    ::v-deep .brand {
      gap: 8px;

      svg {
        width: 37px;
        height: 34px;
      }

      strong {
        font-size: 19px;
      }

      small {
        font-size: 9px;
      }
    }

    .text-button {
      font-size: 11px;
    }

    .button {
      font-size: 11px;
      gap: 5px;
      padding: 8px 12px;
      min-height: 38px;
    }
  }
}
</style>
