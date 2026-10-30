<template>
  <div class="book-stage" :class="['stage-' + state, { compact }]" aria-hidden="true">
    <img class="stage-book" :src="asset('book')" alt="" /><img v-for="layer in layers" :key="layer" class="stage-layer"
      :class="'layer-' + layer" :src="asset(layer)" alt="" />
  </div>
</template>

<script>
import { asset } from '../utils/assets'
export default {
  name: 'BookStage',
  props: { state: { type: String, default: 'idle' }, compact: Boolean },
  computed: {
    layers() {
      // 不同的显示方式
      return [
        this.state === 'email'
          ? 'email'
          : this.state === 'password'
            ? 'locked'
            : this.state === 'reveal'
              ? 'unlocked'
              : this.state === 'graph'
                ? 'graph'
                : this.state === 'ready'
                  ? 'ready'
                  : 'cards'
      ]
    }
  },
  methods: { asset }
}
</script>
<style lang="less" scoped>
.book-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1.6;
  isolation: isolate;
  pointer-events: none;

  img {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .stage-book {
    width: 70%;
    height: 70%;
    left: 15%;
    top: 17%;
  }

  .stage-layer {
    clip-path: inset(0 0 28%);
    animation: float-pages 6s ease-in-out infinite;
  }

  .layer-email {
    opacity: 0.82;
  }

  .layer-locked,
  .layer-unlocked {
    width: 70%;
    height: 70%;
    left: 15%;
    top: 10%;
    opacity: 0.72;
  }

  .layer-graph {
    opacity: 0.7;
  }

  &.compact {
    max-height: 430px;
  }
}

@keyframes float-pages {
  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .book-stage .stage-layer {
    animation: none;
  }
}
</style>
