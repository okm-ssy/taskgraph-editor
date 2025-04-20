<script setup lang="ts">
import { onMounted, defineProps, watch } from 'vue';

import type { EditorTask } from '../model/EditorTask';
import { useCurrentTasks } from '../store/task_store';

const props = defineProps<{
  editorTasks: EditorTask[];
}>();

// タスクストアからデータと機能を取得
const taskStore = useCurrentTasks();
const { GRAPH_SETTINGS } = taskStore;

// コンポーネントマウント時にグラフデータ構築
onMounted(() => {
  taskStore.buildGraphData();
});

// プロパティの変更を監視
watch(
  () => props.editorTasks,
  () => {
    taskStore.buildGraphData();
  },
  { deep: true },
);
</script>

<template>
  <div class="overflow-auto border border-gray-300 rounded-lg bg-gray-50 p-4">
    <!-- グラフの表示エリア -->
    <div
      class="graph-container relative"
      :style="{
        width: `${taskStore.canvasWidth}px`,
        height: `${taskStore.canvasHeight}px`,
      }"
    >
      <!-- パスの描画 -->
      <svg
        class="absolute top-0 left-0"
        :width="taskStore.canvasWidth"
        :height="taskStore.canvasHeight"
      >
        <path
          v-for="(path, index) in taskStore.graphPaths"
          :key="index"
          :d="taskStore.getPathD(path.from, path.to)"
          stroke="#666"
          stroke-width="2"
          fill="none"
          marker-end="url(#arrow)"
        ></path>

        <!-- 矢印マーカー -->
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"></path>
          </marker>
        </defs>
      </svg>

      <!-- ノードの描画 -->
      <div
        v-for="node in taskStore.graphNodes"
        :key="node.id"
        class="absolute border-2 rounded-lg p-3 shadow-md transition-transform hover:translate-y-[-2px] hover:shadow-lg"
        :class="taskStore.getDifficultyColor(node.difficulty)"
        :style="{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${GRAPH_SETTINGS.nodeWidth}px`,
          height: `${GRAPH_SETTINGS.nodeHeight}px`,
        }"
      >
        <div class="font-bold truncate">{{ node.name }}</div>
        <div class="text-sm truncate">{{ node.description }}</div>
        <div class="text-xs mt-1">難易度: {{ node.difficulty }}</div>
      </div>
    </div>

    <!-- タスクがない場合のメッセージ -->
    <div
      v-if="taskStore.graphNodes.length === 0"
      class="text-center py-10 text-gray-500"
    >
      タスクデータがありません
    </div>
  </div>
</template>

<style scoped>
.graph-container {
  min-width: 800px;
  min-height: 600px;
}
</style>
