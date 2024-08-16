<template>
  <UForm @submit="onSubmitHandler">
    <button v-if="!isPending" type="submit" :disabled="isPending">Send</button>
    <button v-else type="button" @click="onCancel">Abort</button>
  </UForm>
</template>

<script lang="ts" setup>
import UForm from "./uForm.vue";
import { ref } from "vue";

const props = defineProps<{
  onSubmit: (text: string) => Promise<any>;
  onCancel?: () => any;
}>();

const isPending = ref(false);

const onSubmitHandler = async (text: string) => {
  try {
    isPending.value = true;
    await props.onSubmit(text);
  } finally {
    isPending.value = false;
  }
};
</script>

<style></style>
