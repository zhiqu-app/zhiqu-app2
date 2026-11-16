<template>
  <div ref="chart" class="practice-activity-chart" role="img" :aria-label="description" />
</template>

<script>
import { init, use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { motionAllowed } from "../utils/motion";

use([BarChart, GridComponent, TooltipComponent, SVGRenderer]);

export default {
  name: "PracticeActivityChart",
  props: { days: { type: Array, required: true } },
  computed: {
    animate() {
      return motionAllowed();
    },
    description() {
      const counts = this.days.map(({ label, count }) => `${label} ${count} 次`).join("，");
      return `最近七天每日作答次数。${counts}`;
    },
  },
  watch: {
    days: "renderChart",
    animate(enabled) {
      if (!enabled && !this._chart) this.mountChart();
      else this.renderChart();
    },
  },
  mounted() {
    if (!this.animate || !("IntersectionObserver" in window)) {
      this.mountChart();
      return;
    }
    this._visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) this.mountChart();
    }, { threshold: 0.15 });
    this._visibility.observe(this.$refs.chart);
  },
  beforeDestroy() {
    this._visibility?.disconnect();
    this._size?.disconnect();
    window.removeEventListener("resize", this.resizeChart);
    this._chart?.dispose();
  },
  methods: {
    mountChart() {
      if (this._chart) return;
      this._visibility?.disconnect();
      this._chart = init(this.$refs.chart, null, { renderer: "svg" });
      this.renderChart();
      if ("ResizeObserver" in window) {
        this._size = new ResizeObserver(this.resizeChart);
        this._size.observe(this.$refs.chart);
      } else {
        window.addEventListener("resize", this.resizeChart);
      }
    },
    resizeChart() {
      if (!this._chart) return;
      const element = this.$refs.chart;
      if (element.clientWidth !== this._chart.getWidth() || element.clientHeight !== this._chart.getHeight()) {
        this._chart.resize();
      }
    },
    renderChart() {
      if (!this._chart) return;
      this._chart.setOption({
        animation: this.animate,
        animationDuration: 760,
        animationDurationUpdate: 460,
        animationEasing: "cubicOut",
        animationEasingUpdate: "cubicInOut",
        grid: { left: 42, right: 14, top: 27, bottom: 34 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow", shadowStyle: { color: "#25baf31a" } },
          confine: true,
          renderMode: "richText",
          backgroundColor: "#0d263b",
          borderColor: "#315b74",
          textStyle: { color: "#e3f4ff", fontSize: 12 },
          valueFormatter: (value) => `${value} 次`,
        },
        xAxis: {
          type: "category",
          data: this.days.map(({ label }) => label),
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "#29475c" } },
          axisLabel: { color: "#93b6d2", fontSize: 10, interval: 0, margin: 12 },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          splitNumber: 4,
          axisLabel: { color: "#93b6d2", fontSize: 10 },
          splitLine: { lineStyle: { color: "#24445a", type: "dashed" } },
        },
        series: [{
          id: "daily-attempts",
          type: "bar",
          name: "作答次数",
          data: this.days.map(({ key, label, count }) => ({ id: key, name: label, value: count })),
          barMaxWidth: 38,
          itemStyle: {
            borderRadius: [5, 5, 0, 0],
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "#50d9ff" }, { offset: 1, color: "#137fbf" }],
            },
          },
          emphasis: { itemStyle: { color: "#8de9ff" } },
          label: {
            show: true,
            position: "top",
            color: "#d9efff",
            fontSize: 11,
            formatter: ({ value }) => value > 0 ? String(value) : "",
          },
          animationDelay: (index) => index * 55,
        }],
      });
    },
  },
};
</script>

<style lang="less" scoped>
.practice-activity-chart {
  width: 100%;
  min-width: 0;
  height: 100%;
}
</style>
