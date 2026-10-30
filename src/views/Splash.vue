<template>
    <Landing />
</template>
<script>
// 兼容旧入口。实际开屏和首页共用 Landing，开场交互在 ProductIntro 中维护。
import Landing from "./Landing.vue";
export default { name: "Splash", components: { Landing } };
</script>
