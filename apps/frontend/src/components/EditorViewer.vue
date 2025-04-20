<script setup lang="ts">
import { computed } from 'vue';

import { useCurrentTasks } from '../store/task_store';

import JsonInput from './JsonInput.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

// タスクストアからデータ取得
const taskStore = useCurrentTasks();

// タスク数を計算
const taskCount = computed(() => taskStore.editorTasks.length);

// JSONパースハンドラー
const handleParseSuccess = (jsonString: string) => {
  taskStore.parseJsonToTaskgraph(jsonString);
};

// JSONパースエラーハンドラー
const handleParseError = (errorMessage: string) => {
  // ストアにエラーが記録されているので何もしない
  console.error('JSON解析エラー:', errorMessage);
};
</script>

<template>
  <div class="editor-viewer p-4">
    <h2 class="text-xl font-bold mb-4">タスクグラフビュー</h2>

    <!-- JSONインプットコンポーネント -->
    <JsonInput
      @parse-success="handleParseSuccess"
      @parse-error="handleParseError"
    />

    <!-- タスク数表示 -->
    <div class="text-sm text-gray-500 mb-4" v-if="taskCount > 0">
      {{ taskCount }}個のタスクを表示中
    </div>

    <!-- タスクグラフビューアコンポーネント -->
    <TaskgraphViewer :editor-tasks="taskStore.editorTasks" />

    <!-- タスクがない場合のメッセージ -->
    <div v-if="taskCount === 0" class="text-center py-10 text-gray-500">
      <p>タスクが追加されていません。</p>
      <p class="mt-2">
        「JSONを貼り付ける」ボタンをクリックして、JSONデータからタスクを読み込むか、
      </p>
      <p>エディター画面でタスクを追加してください。</p>
    </div>

    <!-- パースエラーの表示 -->
    <div
      v-if="taskStore.taskLoadError"
      class="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded"
    >
      <strong>エラー:</strong> {{ taskStore.taskLoadError }}
    </div>
  </div>
</template>

<style scoped>
.editor-viewer {
  width: 100%;
  height: 100%;
}
</style>
