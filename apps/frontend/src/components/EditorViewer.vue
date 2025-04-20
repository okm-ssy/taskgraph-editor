<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'; // defineAsyncComponent と Suspense をインポート

import { useCurrentTasks } from '../store/task_store';

import JsonInput from './JsonInput.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

// TaskDetailDialog を動的にインポート
const TaskDetailDialog = defineAsyncComponent(
  () => import('./TaskDetailDialog.vue'),
);

// ストアを取得
const taskStore = useCurrentTasks();

// taskCount は既存
const taskCount = computed(() => taskStore.editorTasks.length);

// JSONパース関連のハンドラ（変更なし）
const handleParseSuccess = (jsonString: string) => {
  taskStore.parseJsonToTaskgraph(jsonString);
};
const handleParseError = (errorMessage: string) => {
  console.error('JSONパースエラー(EditorViewer):', errorMessage); // 必要ならストア以外のログも
};
</script>

<template>
  <div class="editor-viewer p-4">
    <h2 class="text-xl font-bold mb-4">タスクグラフビューア</h2>

    <JsonInput
      @parse-success="handleParseSuccess"
      @parse-error="handleParseError"
    />

    <div class="text-sm text-gray-500 my-4" v-if="taskCount > 0">
      {{ taskCount }}個のタスクを表示中
    </div>

    <TaskgraphViewer :editor-tasks="taskStore.editorTasks" />

    <div
      v-if="taskCount === 0 && !taskStore.taskLoadError"
      class="text-center py-10 text-gray-500"
    >
      <p>タスクがありません。</p>
      <p class="mt-2 text-sm">
        「JSONを展開する」ボタンでJSONデータを入力するか、エディタ画面でタスクを追加してください。
      </p>
    </div>

    <div
      v-if="taskStore.taskLoadError"
      class="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded"
    >
      <strong>エラー:</strong> {{ taskStore.taskLoadError }}
    </div>

    <Suspense>
      <template #default>
        <TaskDetailDialog
          v-if="taskStore.isDetailDialogVisible"
          :selected-task="taskStore.selectedTask"
          @close="taskStore.closeDetailDialog"
        />
      </template>
      <template #fallback>
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50"
        >
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"
          />
        </div>
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.editor-viewer {
  width: 100%;
  /* height: 100%; 高さは可変に */
}
</style>
