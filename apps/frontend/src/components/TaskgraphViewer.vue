<script setup lang="ts">
import { onMounted, defineProps, watch, ref } from 'vue';

import type { EditorTask } from '../model/EditorTask';
import { useCurrentTasks } from '../store/task_store'; // ストアをインポート

const props = defineProps<{
  editorTasks: EditorTask[];
}>();

// taskStore インスタンスを取得
const taskStore = useCurrentTasks();
const graphRef = ref<HTMLElement | null>(null);
const isExporting = ref(false); // SVGエクスポート処理中フラグ（既存の機能）

// コンポーネントマウント時にグラフデータ構築
onMounted(() => {
  taskStore.buildGraphData();
});

// props.editorTasks が変更されたらグラフデータ再構築
watch(
  () => props.editorTasks,
  () => {
    taskStore.buildGraphData();
  },
  { deep: true },
);

// SVGエクスポート関数（既存の機能、変更なし）
const exportAsSvg = () => {
  // ... (既存のSVGエクスポートロジック) ...
};
</script>

<template>
  <div>
    <div class="flex justify-end mb-4 gap-2">
      <button
        @click="exportAsSvg"
        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        :disabled="isExporting"
      >
        SVGとして保存
      </button>
    </div>

    <div class="overflow-auto border border-gray-300 rounded-lg bg-gray-50 p-4">
      <div
        ref="graphRef"
        class="graph-container relative"
        :style="{
          width: `${taskStore.canvasWidth}px`,
          height: `${taskStore.canvasHeight}px`,
        }"
      >
        <svg
          class="absolute top-0 left-0 pointer-events-none"
          :width="taskStore.canvasWidth"
          :height="taskStore.canvasHeight"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"></path>
            </marker>
          </defs>
          <path
            v-for="(path, index) in taskStore.graphPaths"
            :key="`path-${path.from.id}-${path.to.id}-${index}`"
            :d="taskStore.getPathD(path.from, path.to)"
            stroke="#666"
            stroke-width="2"
            fill="none"
            marker-end="url(#arrow)"
          ></path>
        </svg>

        <div
          v-for="node in taskStore.graphNodes"
          :key="node.id"
          class="absolute border-2 rounded-lg p-3 shadow-md transition-transform hover:translate-y-[-2px] hover:shadow-lg cursor-pointer bg-opacity-90"
          :class="taskStore.getDifficultyColor(node.difficulty)"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${taskStore.GRAPH_SETTINGS.nodeWidth}px`,
            height: `${taskStore.GRAPH_SETTINGS.nodeHeight}px`,
          }"
          @click="taskStore.selectTask(node.id)"
        >
          <div class="font-bold truncate text-sm">{{ node.name }}</div>
          <div class="text-xs mt-1 truncate text-gray-700">
            {{ node.description }}
          </div>
          <div class="text-xs mt-2 font-medium">
            難易度: {{ node.difficulty }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tailwind CSS を使用しているため、通常はここにカスタムスタイルは不要 */
.graph-container {
  min-width: fit-content; /* Ensure container respects SVG size */
  min-height: fit-content;
}
/* SVG内の要素がクリックイベントを横取りしないように */
.pointer-events-none {
  pointer-events: none;
}
</style>
