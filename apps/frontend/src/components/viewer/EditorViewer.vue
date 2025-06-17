<template>
  <div class="editor-viewer">
    <!-- ヘッダー情報 -->
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <div class="flex items-center gap-4">
        <h3 class="font-semibold">タスクグラフビューアー</h3>
        <div v-if="taskCount > 0" class="text-sm text-gray-600">
          <span class="font-medium">総工数: {{ totalDifficulty }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="exportSvg"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          :disabled="isExporting"
        >
          SVGとして保存
        </button>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="p-4">
      <TaskgraphViewer
        ref="taskgraphViewerRef"
        :editor-tasks="editorTasks"
        :compact="isCompactMode"
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
import { onMounted, ref, toRefs, computed } from 'vue';

import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const props = defineProps<{
  compactMode?: boolean;
  minimalHeader?: boolean;
}>();

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const isExporting = ref(false);

// 表示モード管理（propsから取得）
const isCompactMode = computed(() => props.compactMode ?? false);

// toRefsでリアクティブな値を取得
const { editorTasks, taskCount, totalDifficulty } = toRefs(taskStore);

// SVG export関連（現在は TaskgraphViewer 内で直接処理）

// TaskgraphViewerからgraphRefを受け取るためのref
const taskgraphViewerRef = ref<InstanceType<typeof TaskgraphViewer> | null>(
  null,
);

const exportSvg = () => {
  if (taskgraphViewerRef.value) {
    // TaskgraphViewerからgraphRefを取得してSVG出力
    taskgraphViewerRef.value.exportSvg();
  }
};

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
