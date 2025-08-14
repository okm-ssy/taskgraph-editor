<template>
  <div class="w-full h-screen flex flex-col p-4">
    <h2 class="font-bold text-xl mb-4">タスクグラフツール</h2>

    <div class="flex items-center gap-4 mb-4">
      <ProjectSelector />
      <button
        :class="[
          'px-4 py-2 rounded-md text-base transition-colors',
          isReadOnlyMode
            ? 'bg-gray-400 hover:bg-gray-500 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
        ]"
        @click="toggleReadOnlyMode"
        :title="`readOnlyモード: ${isReadOnlyMode ? 'ON' : 'OFF'}`"
      >
        {{ isReadOnlyMode ? '読み取り専用' : '編集モード' }}
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

    <EditorGrid :read-only="isReadOnlyMode" class="flex-1 min-h-0" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

import EditorGrid from '../components/editor/EditorGrid.vue';
import { PROJECT_CONSTANTS, STORAGE_KEYS } from '../constants';
import { useCurrentTasks } from '../store/task_store';

import ExportButton from '@/components/ExportButton.vue';
import JsonInput from '@/components/common/JsonInput.vue';
import ProjectSelector from '@/components/common/ProjectSelector.vue';
import { useProject } from '@/composables/useProject';
import { useAppTitle } from '@/composables/useTitle';

const taskStore = useCurrentTasks();
const { selectedProjectId } = useProject();

// タイトル管理を初期化
useAppTitle();

// readOnlyモードの状態管理
const isReadOnlyMode = ref(
  localStorage.getItem(STORAGE_KEYS.READ_ONLY_MODE) === 'true',
);

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

const taskCount = computed(() => taskStore.editorTasks.length);

// readOnlyモードの切り替え
const toggleReadOnlyMode = () => {
  isReadOnlyMode.value = !isReadOnlyMode.value;
  localStorage.setItem(
    STORAGE_KEYS.READ_ONLY_MODE,
    isReadOnlyMode.value.toString(),
  );
};
</script>

<style scoped lang="scss" />
