<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';

import { useCriticalPath } from '../../composables/useCriticalPath';
import { useCurrentTasks } from '../../store/task_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const taskStore = useCurrentTasks();
const taskCount = computed(() => taskStore.editorTasks.length);

// クリティカルパス計算
const { projectDuration, criticalTaskNames, criticalPath } = useCriticalPath(
  taskStore.editorTasks,
);

onMounted(() => {
  // グラフデータを構築してタスクストアを初期化
  taskStore.buildGraphData();
});
</script>

<template>
  <div class="editor-viewer">
    <!-- ヘッダー情報 -->
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <div class="flex items-center gap-4">
        <h3 class="font-semibold">タスクグラフビューアー</h3>
        <div v-if="taskCount > 0" class="text-sm text-gray-600">
          <span class="font-medium"
            >総難易度: {{ taskStore.totalDifficulty }}</span
          >
          <span class="ml-3 font-medium"
            >プロジェクト所要時間: {{ projectDuration }}</span
          >
          <span class="ml-3 text-blue-600"
            >クリティカルパス: {{ criticalTaskNames.length }}タスク</span
          >
        </div>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="p-4">
      <TaskgraphViewer
        :editor-tasks="taskStore.editorTasks"
        :critical-path="criticalPath"
      />

      <div
        v-if="taskCount === 0 && !taskStore.taskLoadError"
        class="text-center py-10 text-gray-500"
      >
        <p>タスクがありません。</p>
        <p class="mt-2 text-sm">
          「JSONを編集する」ボタンでJSONデータを入力するか、エディタ画面でタスクを追加してください。
        </p>
      </div>

      <div
        v-if="taskStore.taskLoadError"
        class="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded"
      >
        <strong>エラー:</strong> {{ taskStore.taskLoadError }}
      </div>
    </div>

    <TaskDialog
      :is-visible="taskStore.isDetailDialogVisible"
      :title="`タスク詳細: ${taskStore.selectedTask?.task.name}`"
      @close="taskStore.closeDetailDialog"
    >
      <TaskDetail
        v-if="taskStore.selectedTask"
        :task="taskStore.selectedTask"
      />
      <div v-else class="text-red-600">
        エラー: タスク情報が見つかりません。
      </div>
    </TaskDialog>
  </div>
</template>

<style scoped>
.editor-viewer {
  width: 100%;
}
</style>
