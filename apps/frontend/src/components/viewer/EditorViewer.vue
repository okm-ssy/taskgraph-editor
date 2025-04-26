<script setup lang="ts">
import { computed } from 'vue';

import { useCurrentTasks } from '../../store/task_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const taskStore = useCurrentTasks();
const taskCount = computed(() => taskStore.editorTasks.length);
</script>

<template>
  <div class="editor-viewer p-4">
    <TaskgraphViewer :editor-tasks="taskStore.editorTasks" />

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
