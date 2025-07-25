<template>
  <div class="w-full p-4">
    <h2 class="font-bold text-xl mb-4">タスクグラフツール</h2>

    <div class="flex items-center gap-4 mb-4">
      <ProjectSelector />
      <Switcher :modelValue="currentPage" @update:modelValue="navigateToPage" />
      <div class="flex items-center gap-2 border p-2 rounded-2xl">
        <button
          :class="[
            'px-4 py-2 rounded-md text-base transition-colors',
            isCompactMode
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
          ]"
          @click="toggleCompactMode"
          :title="`コンパクトモード: ${isCompactMode ? 'ON' : 'OFF'}`"
        >
          {{ isCompactMode ? 'コンパクト中' : 'コンパクト' }}
        </button>
      </div>
    </div>

    <JsonInput
      @parse-success="handleParseSuccess"
      @parse-error="handleParseError"
    />

    <div class="text-sm text-gray-500 my-4" v-if="taskCount > 0">
      {{ taskCount }}個のタスク
    </div>

    <ViewerPage
      v-if="currentPage.id === 'viewer'"
      :compact-mode="isCompactMode"
    />
    <EditorPage
      v-else-if="currentPage.id === 'editor'"
      :compact-mode="isCompactMode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { STORAGE_KEYS } from '../constants';
import { useCurrentTasks } from '../store/task_store';
import { Page, viewerPage, editorPage } from '../store/types/page';

import EditorPage from './EditorPage.vue';
import ViewerPage from './ViewerPage.vue';

import JsonInput from '@/components/common/JsonInput.vue';
import ProjectSelector from '@/components/common/ProjectSelector.vue';
import Switcher from '@/components/common/Switcher.vue';
import { useAppTitle } from '@/composables/useTitle';

const router = useRouter();
const route = useRoute();
const taskStore = useCurrentTasks();

// タイトル管理を初期化
useAppTitle();

// URLに基づいて現在のページを設定
const currentPage = computed<Page>(() => {
  if (route.path === '/edit') {
    return editorPage;
  }
  return viewerPage;
});

const isCompactMode = ref(
  localStorage.getItem(STORAGE_KEYS.COMPACT_MODE) === 'true',
);

// ページ切り替え時にルートを変更
const navigateToPage = (page: Page) => {
  if (page.id === 'editor') {
    router.push('/edit');
  } else {
    router.push('/view');
  }
};

// ストア初期化確認
onMounted(() => {
  taskStore.initializeStore();
});

// クリーンアップ
onUnmounted(() => {
  taskStore.stopPolling();
});

const handleParseSuccess = (jsonString: string) => {
  taskStore.parseJsonToTaskgraph(jsonString);
};
const handleParseError = (errorMessage: string) => {
  console.error('JSONパースエラー(EditorViewer):', errorMessage);
};

// コンパクトモードの切り替え
const toggleCompactMode = () => {
  isCompactMode.value = !isCompactMode.value;
  localStorage.setItem(
    STORAGE_KEYS.COMPACT_MODE,
    isCompactMode.value.toString(),
  );
};

const taskCount = computed(() => taskStore.editorTasks.length);
</script>

<style scoped lang="scss" />
