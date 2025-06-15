<script setup lang="ts">
import { computed, onMounted, nextTick, ref } from 'vue';

import { useCriticalPath } from '../../composables/useCriticalPath';
import { useCurrentTasks } from '../../store/task_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const taskStore = useCurrentTasks();
const taskCount = computed(() => taskStore.editorTasks.length);

// 強制更新用のトリガー
const forceUpdateTrigger = ref(0);

// クリティカルパス計算（強制更新トリガーも含める）
const criticalPathComputed = computed(() => {
  // トリガーを参照して強制的に再計算
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  forceUpdateTrigger.value;
  return useCriticalPath(taskStore.editorTasks);
});

const { projectDuration, criticalTaskNames, criticalPath } =
  criticalPathComputed.value;

onMounted(async () => {
  // グラフデータを構築してタスクストアを初期化
  taskStore.buildGraphData();

  // 次のティックまで待ってから強制的にクリティカルパス再計算
  await nextTick();

  // 強制更新をトリガー
  forceUpdateTrigger.value++;

  // さらに待ってもう一度トリガー
  await nextTick();
  forceUpdateTrigger.value++;

  // タスクが存在する場合は追加の初期化
  if (taskStore.editorTasks.length > 0) {
    console.log('ビューアー初期化: タスク数', taskStore.editorTasks.length);
    console.log('ビューアー初期化: クリティカルパス', criticalPath);
  }
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
