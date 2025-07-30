<template>
  <button
    @click="handleExport"
    :disabled="isExporting"
    :class="[
      'px-4 py-2 rounded-md text-base transition-colors',
      'bg-blue-500 hover:bg-blue-600 text-white',
      'disabled:bg-gray-300 disabled:cursor-not-allowed',
    ]"
    :title="title"
  >
    {{ isExporting ? 'エクスポート中...' : 'エクスポート' }}
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

import { useTaskExport } from '@/composables/useTaskExport';
import { useCurrentTasks } from '@/store/task_store';

const taskStore = useCurrentTasks();
const { downloadFiles } = useTaskExport();

const isExporting = ref(false);

const title = computed(() => {
  const taskCount = taskStore.tasks.length;
  if (taskCount === 0) {
    return 'エクスポートするタスクがありません';
  }
  return `${taskCount}個のタスクを3つのMarkdownファイルにエクスポート`;
});

const handleExport = async () => {
  if (taskStore.tasks.length === 0) {
    return;
  }

  isExporting.value = true;

  try {
    downloadFiles();
  } catch (error) {
    console.error('エクスポートエラー:', error);
  } finally {
    isExporting.value = false;
  }
};
</script>

<style scoped></style>
