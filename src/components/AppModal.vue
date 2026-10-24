<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc.prevent="$emit('close')">
    <section
      ref="dialog"
      class="app-modal panel"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
      @keydown.tab="trap"
    >
      <header>
        <h2>{{ title }}</h2>
        <button class="icon-button" aria-label="关闭弹窗" @click="$emit('close')">
          <AppIcon name="close" />
        </button>
      </header>
      <slot />
    </section>
  </div>
</template>
<script>
export default {
  name: 'AppModal',
  props: { title: { type: String, required: true } },
  mounted() {
    this.previous = document.activeElement
    this.previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    this.$nextTick(() => {
      const first = this.$refs.dialog.querySelector('input, button, select, textarea, a[href]')
      ;(first || this.$refs.dialog).focus()
    })
  },
  beforeDestroy() {
    document.body.style.overflow = this.previousOverflow
    if (this.previous && this.previous.isConnected) this.previous.focus()
  },
  methods: {
    trap(e) {
      const list = Array.from(
        this.$refs.dialog.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
        )
      )
      const first = list[0]
      const last = list[list.length - 1]
      if (!first) {
        e.preventDefault()
        return
      }
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === this.$refs.dialog)
      ) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #010913c9;
  backdrop-filter: blur(7px);
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.app-modal {
  width: 560px;
  max-width: 100%;
  max-height: 90dvh;
  overflow-y: auto;
  padding: 26px;
  box-shadow: 0 20px 100px #0009;
  > header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h2 {
      margin: 0;
    }
  }
}
@media (max-width: 767px) {
  .app-modal {
    padding: 20px;
    max-height: 86dvh;
  }
  .modal-backdrop {
    padding: 14px;
  }
}
</style>
