<template>
  <div class="w-full p-4">
    <h2 class="text-xl font-bold mb-4">タスクグラフツール</h2>
    <Switcher v-model="currentPage" />

    <JsonInput
      @parse-success="handleParseSuccess"
      @parse-error="handleParseError"
    />

    <div class="text-sm text-gray-500 my-4" v-if="taskCount > 0">
      {{ taskCount }}個のタスク
    </div>

    <ViewerPage v-if="currentPage.id === 'viewer'" />
    <EditorPage v-else-if="currentPage.id === 'editor'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

import { useCurrentTasks } from '../store/task_store';
import { Page, viewerPage } from '../store/types/page';

import EditorPage from './EditorPage.vue';
import ViewerPage from './ViewerPage.vue';

import JsonInput from '@/components/common/JsonInput.vue';
import Switcher from '@/components/common/Switcher.vue';

const taskStore = useCurrentTasks();
const currentPage = ref<Page>(viewerPage);

const handleParseSuccess = (jsonString: string) => {
  taskStore.parseJsonToTaskgraph(jsonString);
};
const handleParseError = (errorMessage: string) => {
  console.error('JSONパースエラー(EditorViewer):', errorMessage);
};

const taskCount = computed(() => taskStore.editorTasks.length);
</script>

<style scoped lang="scss" />
