<template>
  <main class="landing-page">
    <PublicHeader>
      <BrandLogo />
      <nav class="landing-links">
        <a href="#advantages" @click.prevent="scrollTo('advantages')">产品优势</a>
        <a href="#workflow" @click.prevent="scrollTo('workflow')">学习流程</a>
      </nav>
      <router-link to="/login" class="button primary small-button">
        进入学习空间
        <AppIcon name="arrow" :size="16" />
      </router-link>
    </PublicHeader>
    <section class="landing-hero">
      <div class="hero-copy">
        <span class="eyebrow"><i class="dot cyan" />属于你的 AI 学习空间</span>
        <h1>
          把零散知识，<br />连成你的
          <span>学习路径</span>
        </h1>
        <p>从一份课堂讲义，到一次真正的理解。<br />让资料、提问、练习与复习，在这里连成一条线。</p>
        <div class="button-row">
          <button class="button primary" @click="experience">
            开始学习
            <AppIcon name="arrow" :size="18" />
          </button>
          <a href="#advantages" class="button secondary" @click.prevent="scrollTo('advantages')">
            <AppIcon name="play" :size="16" />探索知序
          </a>
        </div>
        <div class="hero-caption">
          <span>课程资料有序归档</span>
          <span>学习记录持续积累</span>
        </div>
      </div>
      <div class="hero-visual">
        <KnowledgeGraph :selected="selected" @select="selected = $event.id" />
        <div class="floating-note">
          <i class="dot amber" /> 从「特征值」到「理解矩阵」
          <small>让知识之间的连接清晰可见</small>
        </div>
      </div>
    </section>
    <section id="advantages" class="landing-section">
      <span class="eyebrow">从一个问题，到下一步行动</span>
      <h2>学习的每一步，都有迹可循</h2>
      <div class="advantage-grid">
        <article v-for="item in features" :key="item.title" class="panel advantage-card">
          <AppIcon :name="item.icon" :size="30" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
          <div class="feature-preview" :class="item.icon">
            <template v-if="item.icon === 'file'">
              <AppIcon name="file" />
              <span>线性代数 · 第三章讲义</span>
              <span class="badge">已归档</span>
            </template>
            <template v-else-if="item.icon === 'edit'">
              <span class="mini-check"> ✓ </span>
              <span>理解一个知识点<br />
                <small>再用一道题检验</small>
              </span>
            </template>
            <template v-else>
              <i v-for="n in 5" :key="n" :style="{ height: n * 9 + 12 + 'px' }" />
              <span>看见你的积累</span>
            </template>
          </div>
        </article>
      </div>
    </section>
    <section id="workflow" class="landing-section workflow-section">
      <div>
        <span class="eyebrow">你的知识，逐页归位</span>
        <h2>让学习形成自己的节奏</h2>
        <p class="muted">导入资料，带着问题阅读，用练习验证，给复习一个具体的时间。</p>
        <button class="button primary" @click="experience">
          体验示例课程
          <AppIcon name="arrow" :size="18" />
        </button>
      </div>
      <ol class="workflow-list">
        <li v-for="(step, i) in steps" :key="step">
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
            {{ step }}
          <AppIcon name="check" :size="18" />
        </li>
      </ol>
    </section>
    <PublicFooter>
      <BrandLogo />
      <span>大学生 AI 教育与学习平台 · V2 前端演示</span>
      <a href="#" @click.prevent="scrollTo('top')">返回顶部 ↑</a>
    </PublicFooter>
  </main>
</template>
<script>
import PublicHeader from '../components/PublicHeader.vue'
import PublicFooter from '../components/PublicFooter.vue'
import BrandLogo from '../components/BrandLogo.vue'
import KnowledgeGraph from '../components/KnowledgeGraph.vue'
import { enterDemo } from '../services/auth'
import { getToken } from '../services/api'
export default {
  name: 'Landing',
  components: { PublicHeader, PublicFooter, BrandLogo, KnowledgeGraph },
  data: () => ({
    selected: 'eigen',
    features: [
      {
        icon: 'file',
        title: '留存有依据的资料',
        text: '把讲义和笔记放回各自的课程。阅读与检索，都从你的资料开始。'
      },
      {
        icon: 'edit',
        title: '让理解经得起练习',
        text: '选择答案，回看解析，收集需要巩固的问题。把“看懂了”变成“会用了”。'
      },
      {
        icon: 'chart',
        title: '看见真实的学习记录',
        text: '用实际作答记录回顾学习。把下一步行动，安排进你的复习计划。'
      }
    ],
    steps: ['导入课程资料', '阅读与提问', '练习检验理解', '安排下一次复习']
  }),
  methods: {
    async experience() {
      if (!getToken()) await enterDemo()
      this.$router.push('/app/overview')
    },
    scrollTo(id) {
      if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' })
      else document.getElementById(id).scrollIntoView({ behavior: 'smooth' })
    }
  }
}
</script>

<style lang="less" scoped>
@import '../styles/tokens.less';

/* 本组件的布局、状态、动效与响应式样式。 */

.landing-page {
  min-height: 100dvh;
  background: #031524 url('/assets/planet.png') center 0 / 100% auto no-repeat;

  .public-header {
    max-width: 1600px;
    margin: 0 auto;
  }

  .public-footer {
    margin-top: 50px;
    border-top: 1px solid #1c3d50;
  }
}

.landing-links {
  display: flex;
  gap: 38px;
  color: #a5c9e7;
  font-size: 14px;
}

.landing-hero {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 40px;
  align-items: center;
  min-height: 540px;
  max-width: 1440px;
  padding: 65px 5% 70px;
  margin: 0 auto;

  .hero-copy {
    position: relative;
    z-index: 1;

    h1 {
      font-size: clamp(38px, 4.5vw, 62px);
      line-height: 1.25;
      letter-spacing: 1px;
      margin-bottom: 25px;

      span {
        color: #14c3f8;
      }
    }

    p {
      color: #aacbe8;
      font-size: 16px;
      line-height: 1.9;
      margin-bottom: 28px;
    }

    .eyebrow {
      display: flex;
      gap: 9px;
      align-items: center;
    }

    .button {
      min-height: 48px;
    }
  }

  .hero-caption {
    display: flex;
    gap: 24px;
    color: #86a5c0;
    font-size: 11px;
    margin-top: 30px;
  }
}

.hero-visual {
  position: relative;

  .knowledge-graph {
    transform: scale(1.08);
  }

  .floating-note {
    border: 1px solid #2d546e;
    border-radius: 8px;
    padding: 13px 18px;
    background: #0b243bd9;
    color: #d5e9fa;
    font-size: 13px;
    width: max-content;
    max-width: 100%;
    margin: -4px auto 0;

    .dot {
      margin-right: 8px;
    }

    small {
      display: block;
      color: #87afcd;
      font-size: 11px;
      padding-left: 15px;
      margin-top: 4px;
    }
  }
}

.landing-section {
  max-width: 1320px;
  padding: 45px 34px;
  margin: 0 auto;

  > h2,
  > .eyebrow {
    text-align: center;
  }

  > h2 {
    font-size: 30px;
    margin-bottom: 38px;
  }
}

.advantage-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.advantage-card {
  padding: 28px;

  > .app-icon {
    color: #1ab6f6;
    margin-bottom: 22px;
  }

  h3 {
    font-size: 21px;
    margin-bottom: 12px;
  }

  p {
    color: #9bbddb;
    font-size: 14px;
    min-height: 72px;
  }
}

.feature-preview {
  margin-top: 24px;
  border: 1px solid #1a4965;
  background: #071e32;
  border-radius: 7px;
  min-height: 94px;
  padding: 20px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: #a8c9e4;

  .app-icon {
    color: #189dff;
  }

  &.chart {
    align-items: end;

    i {
      display: block;
      background: linear-gradient(@cyan, #1764e5);
      width: 13px;
      border-radius: 2px 2px 0 0;
    }

    span {
      margin-left: auto;
    }
  }

  .mini-check {
    color: @cyan;
    font-size: 28px;
  }

  small {
    color: #6d9dbc;
  }
}

.workflow-section {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 100px;
  align-items: center;
  padding-top: 90px;
  padding-bottom: 90px;

  h2 {
    font-size: 30px;
    margin-bottom: 20px;
  }

  .button {
    margin-top: 16px;
  }
}

.workflow-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    border-bottom: 1px solid #1a3d54;
    padding: 17px 0;
    display: flex;
    align-items: center;
    gap: 20px;

    span {
      color: #36bbff;
      font-size: 18px;
    }

    .app-icon {
      margin-left: auto;
      color: #3dcced;
    }
  }
}

@media (max-width: 1199px) {
  .landing-hero {
    gap: 15px;
    padding-top: 45px;
    min-height: 470px;
  }

  .advantage-card {
    padding: 22px;
  }
}

@media (max-width: 900px) and (min-width: 768px) {
  .landing-links {
    gap: 20px;
  }

  .advantage-grid {
    gap: 12px;
  }

  .feature-preview {
    padding: 12px 10px;
  }
}

@media (max-width: 767px) {
  .landing-page {
    background-size: auto 660px;
  }

  .landing-links {
    display: none;
  }

  .landing-hero {
    grid-template-columns: 1fr;
    padding: 45px 24px 30px;
    gap: 20px;

    .hero-copy h1 {
      font-size: 39px;
      margin-bottom: 20px;
    }

    .hero-copy p {
      font-size: 14px;
      margin-bottom: 24px;
    }

    .hero-caption {
      font-size: 10px;
      gap: 16px;
      margin-top: 20px;
    }

    .hero-visual {
      padding-top: 10px;

      .knowledge-graph {
        transform: none;
      }

      .floating-note {
        font-size: 11px;
      }
    }
  }

  .landing-section {
    padding: 35px 20px;

    > h2 {
      font-size: 25px;
      margin-bottom: 25px;
    }

    .eyebrow {
      font-size: 11px;
    }
  }

  .advantage-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .advantage-card {
    padding: 24px;

    > .app-icon {
      margin-bottom: 16px;
    }

    p {
      min-height: auto;
      font-size: 14px;
    }

    .feature-preview {
      margin-top: 20px;
      min-height: 85px;
      font-size: 12px;
    }
  }

  .workflow-section {
    grid-template-columns: 1fr;
    gap: 25px;
    padding-top: 50px;

    h2 {
      font-size: 25px;
    }
  }
}

@media (max-width: 380px) {
  .landing-hero .hero-copy h1 {
    font-size: 34px;
  }
}
</style>
