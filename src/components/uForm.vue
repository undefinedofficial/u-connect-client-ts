<template>
  <form class="u-form" @submit.prevent="emit('submit', value)">
    <input v-model="value" class="u-form__input" type="text" />
    <slot />
  </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const value = ref("I'm undefined");

const emit = defineEmits<{
  submit: [string];
}>();
</script>

<style>
.u-form {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.u-form__input {
  width: 100%;
}
</style>
