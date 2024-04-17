<template>
  <ul class="u-list">
    <li v-for="(r, i) in responses" :key="i">{{ r }}</li>
  </ul>
</template>

<script lang="ts" setup>
defineProps<{
  responses: string[];
}>();
</script>

<style>
.u-list {
  list-style: decimal-leading-zero;
  overflow: auto;
  width: 100%;
  height: 100%;
}
</style>
