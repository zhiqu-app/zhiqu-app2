<template>
  <article class="panel course-card" :class="{ compact }">
    <img :src="asset(course.cover)" :alt="course.name + '课程封面'" />
    <div class="course-card-content">
      <div class="course-title">
        <h2>{{ course.name }}</h2>
        <span class="badge" :class="{ muted: course.archived }">
          {{course.archived ? "已归档" : "进行中"}}
        </span>
        <span class="teacher">授课教师：{{ course.teacher }}</span>
        <button class="icon-button"
          :aria-label="course.archived ? '恢复课程' : '归档课程'" @click="$emit('archive', course)">
          <AppIcon :name="course.archived ? 'book' : 'download'" :size="18" />
        </button>
        <button v-if="deletable" class="icon-button" :aria-label="'删除课程' + course.name"
          @click="$emit('delete', course)">
          <AppIcon name="trash" :size="18" />
        </button>
      </div>
      <p class="course-chapter">{{ course.chapter }}</p>
      <span v-if="course._remote === false" class="badge amber">本机课程 · 尚未同步</span>
      <p class="course-description">{{ course.description }}</p>
      <div class="course-progress">
        <div class="progress-track">
          <i :style="{ width: course.progress + '%' }" />
        </div>
        <span>{{ course.progress }}%</span>
        <span>{{ Math.round((course.progress * course.lessons) / 100) }} /{{ course.lessons }} 节</span>
      </div>
      <div class="course-card-footer">
        <div>
          <AppIcon name="file" /><span><strong>{{ materialCount }} 份资料</strong><small>讲义 · 课堂笔记</small></span>
        </div>
        <div class="course-exercise">
          <AppIcon name="edit" /><span><strong>知识巩固</strong><small>练习与理解同步</small></span>
        </div>
        <router-link :to="'/app/courses/' + course.id" class="button primary">{{ course.archived ? "查看课程" : "继续学习"}}
          <AppIcon name="chevron" :size="18" />
        </router-link>
      </div>
    </div>
  </article>
</template>
<script>
import { asset } from "../utils/assets";
export default {
  name: "CourseCard",
  props: {
    course: { type: Object, required: true },
    materialCount: { type: Number, default: 0 },
    compact: Boolean,
    deletable: Boolean,
  },
  methods: { asset },
};
</script>

<style lang="less" scoped>
@import "../styles/tokens.less";

/* 本组件的布局、状态、动效与响应式样式。 */

@media (min-width: 768px) {
  .course-card.compact {
    min-height: 96px;

    >img {
      width: 145px;
      min-height: 0;
      height: 72px;
    }

    .course-card-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 155px;
      column-gap: 20px;
    }

    .course-title {
      grid-column: 1 / -1;

      h2 {
        font-size: 20px;
      }
    }

    .course-chapter {
      margin: 5px 0;
      font-size: 13px;
    }

    .course-description {
      display: none;
    }

    .course-progress {
      grid-column: 1;
      gap: 10px;
      font-size: 10px;

      .progress-track {
        height: 6px;
      }
    }

    .course-card-footer {
      grid-column: 2;
      grid-row: 2 / 4;
      border: 0;
      padding: 0;
      margin: 0;

      >div {
        display: none;
      }

      >.button {
        padding: 6px 15px;
        min-height: 36px;
        font-size: 12px;
        width: 100%;
      }
    }
  }
}

.course-card {
  display: flex;
  gap: 24px;
  padding: 16px;
  margin-bottom: 13px;

  >img {
    width: 184px;
    min-height: 190px;
    object-fit: cover;
    border: 1px solid #143d5d;
    border-radius: 6px;
  }

  .course-card-content {
    flex: 1;
    min-width: 0;
  }
}

.course-title {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    font-size: 23px;
    margin: 0;
  }

  .teacher {
    margin-left: auto;
    color: #8db6d6;
    font-size: 11px;
  }

  .icon-button {
    width: 25px;
    height: 30px;
  }
}

.course-chapter {
  font-size: 17px;
  color: #a9d2f4;
  margin: 7px 0;
}

.course-description {
  font-size: 13px;
  color: #9cbfe0;
  max-width: 470px;
  margin-bottom: 13px;
  line-height: 1.8;
}

.course-progress {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 12px;
  color: #a3cbed;

  .progress-track {
    flex: 1;
  }

  >span:last-child {
    white-space: nowrap;
  }
}

.course-card-footer {
  display: flex;
  align-items: center;
  gap: 18px;
  border-top: 1px solid #15374c;
  margin-top: 15px;
  padding-top: 13px;

  >div {
    display: flex;
    align-items: center;
    gap: 12px;

    .app-icon {
      color: #2a9aff;
    }

    strong {
      font-weight: 500;
      display: block;
      font-size: 13px;
    }

    small {
      color: #83acca;
      font-size: 11px;
      display: block;
      margin-top: 3px;
    }
  }

  .course-exercise {
    padding-left: 20px;
    border-left: 1px solid #183b54;

    .app-icon {
      color: @amber;
    }
  }

  >.button {
    margin-left: auto;
    min-height: 43px;
    font-size: 14px;
    padding: 8px 19px;
  }
}

@media (min-width: 1600px) {
  .course-card {
    >img {
      width: 215px;
    }
  }
}

@media (max-width: 1390px) and (min-width: 1200px) {
  .course-card {
    gap: 16px;

    >img {
      width: 140px;
    }

    .course-title h2 {
      font-size: 21px;
    }

    .teacher {
      display: none;
    }

    .course-exercise {
      display: none;
    }
  }
}

@media (max-width: 1199px) {
  .course-card {
    gap: 16px;

    >img {
      width: 145px;
    }

    .course-title .teacher {
      display: none;
    }

    .course-exercise {
      display: none;
    }
  }
}

@media (max-width: 767px) {
  .course-card {
    gap: 12px;
    padding: 13px;
    align-items: flex-start;

    >img {
      width: 75px;
      height: 95px;
      min-height: 0;
    }

    .course-card-content {
      min-width: 0;
    }

    .course-title {
      gap: 7px;
      flex-wrap: wrap;

      h2 {
        font-size: 18px;
      }

      .badge {
        font-size: 9px;
        padding: 1px 5px;
      }

      .icon-button {
        margin-left: auto;
        width: 22px;
      }
    }

    .course-chapter {
      font-size: 12px;
      margin: 6px 0;
    }

    .course-description {
      display: none;
    }

    .course-progress {
      flex-wrap: wrap;
      gap: 6px 12px;
      font-size: 10px;

      .progress-track {
        width: 100%;
        flex-basis: 100%;
        height: 5px;
      }
    }

    .course-card-footer {
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;

      >div {
        display: none;
      }

      >.button {
        font-size: 12px;
        padding: 5px 10px;
        min-height: 36px;
        width: 100%;
      }
    }
  }
}

@media (max-width: 380px) {
  .course-card .course-title h2 {
    font-size: 16px;
  }
}
</style>
