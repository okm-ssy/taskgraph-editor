<template>
  <button
    @click="emit('click')"
    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center"
  >
    <span class="mr-1">+</span>
    <span>タスク追加</span>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped></style>