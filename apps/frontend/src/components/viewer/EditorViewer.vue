<template>
  <div class="editor-viewer">
    <!-- ヘッダー情報 -->
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <div class="flex items-center gap-4">
        <h3 class="font-semibold">タスクグラフビューアー</h3>
        <div v-if="taskCount > 0" class="text-sm text-gray-600">
          <span class="font-medium">総難易度: {{ totalDifficulty }}</span>
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
        :editor-tasks="editorTasks"
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
      :is-visible="uiStore.isDetailDialogVisible"
      :title="`タスク詳細: ${taskStore.selectedTask?.task.name}`"
      @close="uiStore.closeDetailDialog"
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

<script setup lang="ts">
import { onMounted, toRefs } from 'vue';

import { useCurrentTasks } from '../../store/task_store';
import { useEditorUIStore } from '../../store/editor_ui_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();

// toRefsでリアクティブな値を取得
const {
  editorTasks,
  taskCount,
  totalDifficulty,
  projectDuration,
  criticalTaskNames,
  criticalPath,
} = toRefs(taskStore);

onMounted(() => {
  // グラフデータを構築してタスクストアを初期化
  taskStore.buildGraphData();
});
</script>

<style scoped>
.editor-viewer {
  width: 100%;
}
</style>
