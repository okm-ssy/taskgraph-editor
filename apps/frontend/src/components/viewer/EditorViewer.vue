<template>
  <div class="editor-viewer">
    <!-- ヘッダー情報 -->
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <div class="flex items-center gap-4">
        <h3 class="font-semibold">タスクグラフビューアー</h3>
        <div v-if="taskCount > 0" class="text-sm text-gray-600">
          <span class="font-medium">総工数: {{ totalDifficulty }}</span>
          <span class="ml-3 text-blue-600"
            >クリティカルパス: {{ criticalTaskNames.length }}タスク</span
          >
          <span class="ml-3 font-medium">最低工数: {{ projectDuration }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          :class="[
            'px-3 py-1 rounded-md text-sm transition-colors',
            isCompactMode
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
          ]"
          @click="toggleCompactMode"
          :title="`コンパクトモード: ${isCompactMode ? 'ON' : 'OFF'}`"
        >
          {{ isCompactMode ? 'コンパクト中' : 'コンパクト' }}
        </button>
        <button
          :class="[
            'px-3 py-1 rounded-md text-sm transition-colors',
            isMinimalHeader
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
          ]"
          @click="toggleMinimalHeader"
          :title="`ヘッダー最小化: ${isMinimalHeader ? 'ON' : 'OFF'}`"
        >
          {{ isMinimalHeader ? 'ヘッダー最小中' : 'ヘッダー最小' }}
        </button>
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
        :critical-path="criticalPath"
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
import { onMounted, ref, toRefs } from 'vue';

import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

import TaskDetail from './TaskDetail.vue';
import TaskDialog from './TaskDialog.vue';
import TaskgraphViewer from './TaskgraphViewer.vue';

const emit = defineEmits<{
  (e: 'update:minimal-header', value: boolean): void;
}>();

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const isExporting = ref(false);

// 表示モード管理（localStorage から復元）
const isCompactMode = ref(
  localStorage.getItem('taskgraph-compact-mode') === 'true',
);
const isMinimalHeader = ref(
  localStorage.getItem('taskgraph-minimal-header') === 'true',
);

// toRefsでリアクティブな値を取得
const {
  editorTasks,
  taskCount,
  totalDifficulty,
  projectDuration,
  criticalTaskNames,
  criticalPath,
} = toRefs(taskStore);

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

// コンパクトモードの切り替え
const toggleCompactMode = () => {
  isCompactMode.value = !isCompactMode.value;
  localStorage.setItem(
    'taskgraph-compact-mode',
    isCompactMode.value.toString(),
  );
};

// ヘッダー最小化モードの切り替え
const toggleMinimalHeader = () => {
  isMinimalHeader.value = !isMinimalHeader.value;
  localStorage.setItem(
    'taskgraph-minimal-header',
    isMinimalHeader.value.toString(),
  );
  emit('update:minimal-header', isMinimalHeader.value);
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
