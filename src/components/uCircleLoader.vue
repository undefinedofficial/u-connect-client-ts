<template>
  <span class="relative">
    <svg class="spinner" :height="size" :width="size" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <circle
        class="path"
        fill="none"
        stroke="currentColor"
        stroke-width="6"
        stroke-linecap="round"
        cx="33"
        cy="33"
        r="30"
      ></circle>
    </svg>
  </span>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    size?: string;
  }>(),
  {
    size: "18px"
  }
);
</script>

<style lang="scss" scoped>
$offset: 187;
$duration: 1.4s;

.spinner {
  // height: 16px;
  width: 100%;
  animation: rotator $duration linear infinite;
}

@keyframes rotator {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.path {
  stroke-dasharray: $offset;
  stroke-dashoffset: 0;
  transform-origin: center;
  animation: dash $duration ease-in-out infinite;
}

@keyframes dash {
  0% {
    stroke-dashoffset: $offset;
  }
  50% {
    stroke-dashoffset: calc($offset / 4);
    transform: rotate(135deg);
  }
  100% {
    stroke-dashoffset: $offset;
    transform: rotate(360deg);
  }
}
</style>
