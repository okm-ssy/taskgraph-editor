<template>
  <div class="w-full p-4">
    <div class="flex items-center gap-3 mb-4">
      <h2 class="font-bold text-xl">タスクグラフツール</h2>
      <a
        v-if="hasGitHubProjectInfo"
        :href="gitHubProjectUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          ></path>
        </svg>
        GitHub
      </a>
    </div>

    <div class="flex items-center gap-4 mb-4">
      <ProjectSelector />
      <Switcher :modelValue="currentPage" @update:modelValue="navigateToPage" />
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
      <ExportButton />
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

import { STORAGE_KEYS, PROJECT_CONSTANTS } from '../constants';
import { useCurrentTasks } from '../store/task_store';
import { Page, viewerPage, editorPage } from '../store/types/page';

import EditorPage from './EditorPage.vue';
import ViewerPage from './ViewerPage.vue';

import ExportButton from '@/components/ExportButton.vue';
import JsonInput from '@/components/common/JsonInput.vue';
import ProjectSelector from '@/components/common/ProjectSelector.vue';
import Switcher from '@/components/common/Switcher.vue';
import { useProject } from '@/composables/useProject';
import { useAppTitle } from '@/composables/useTitle';

const router = useRouter();
const route = useRoute();
const taskStore = useCurrentTasks();
const { selectedProjectId } = useProject();

// GitHub Projectsへのリンク情報
const hasGitHubProjectInfo = computed(() => {
  return (
    taskStore.info?.github?.organization &&
    taskStore.info?.github?.projectNumber
  );
});

const gitHubProjectUrl = computed(() => {
  if (!hasGitHubProjectInfo.value) return '';
  const { organization, projectNumber } = taskStore.info.github!;
  return `https://github.com/orgs/${organization}/projects/${projectNumber}/views/2`;
});

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
onMounted(async () => {
  // プロジェクトIDが設定されているか、もしくはdefaultを使う場合のみ初期化
  // useProjectで既にlocalStorageから読み込まれているはず
  if (
    selectedProjectId.value ||
    !localStorage.getItem(PROJECT_CONSTANTS.STORAGE_KEY)
  ) {
    await taskStore.initializeStore();
  }
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
