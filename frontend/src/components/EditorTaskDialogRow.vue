<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true,
  },
  titleStyle: {
    type: Object,
    default: () => {},
  },
});
</script>

<template>
  <div class="flex">
    <div :style="titleStyle">{{ title }}</div>
    <div class="m-4" />
    <div class="w-full">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
