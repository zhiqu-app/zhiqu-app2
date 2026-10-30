<template>
  <div class="rate-ring animated-ring" role="img" :aria-label="'正确率 ' + value + '%'" :data-value="value">
    <svg viewBox="0 0 88 88" aria-hidden="true">
      <circle class="ring-track" cx="44" cy="44" r="37" />
      <circle class="ring-progress" cx="44" cy="44" r="37" pathLength="100"
        :stroke-dasharray="Math.max(0, Math.min(100, tweenValue)) + ' 100'" />
    </svg>
    <strong aria-hidden="true">{{ Math.round(tweenValue) }}<small>%</small></strong>
  </div>
</template>
<script>
import animatedValue from '../mixins/animatedValue'
export default { name: 'AnimatedRing', mixins: [animatedValue] }
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.rate-ring {
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: conic-gradient(@cyan var(--rate), #16354c 0);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    background: #0c253a;
  }

  strong {
    position: relative;
    font-size: 24px;
  }

  small {
    font-size: 12px;
  }
}

@media (max-width: 767px) {
  .rate-ring {
    width: 68px;
    height: 68px;
  }
}

.rate-ring.animated-ring {
  background: none;

  &::before {
    display: none;
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
  }

  circle {
    fill: none;
    stroke-width: 7px;
  }

  .ring-track {
    stroke: #173c52;
  }

  .ring-progress {
    stroke: @cyan;
    stroke-linecap: round;
  }
}

.rate-ring small {
  color: #98b6ce;
}
</style>
