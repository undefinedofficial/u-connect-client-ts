<template>
  <UForm @submit="emit('send', $event)">
    <button type="button" v-if="!isOpened" @click="emit('open')">Open</button>
    <template v-else>
      <button type="button" @click="emit('abort')">Abort</button>
      <button type="submit" :disabled="isSended">Send</button>
      <button type="button" @click="emit('complete')">Complete</button>
    </template>
  </UForm>
</template>

<script lang="ts" setup>
import UForm from "./uForm.vue";
defineProps<{
  isOpened?: boolean;
  isSended?: boolean;
}>();

const emit = defineEmits<{
  open: [];
  abort: [];
  send: [string];
  complete: [];
}>();
</script>

<style></style>
