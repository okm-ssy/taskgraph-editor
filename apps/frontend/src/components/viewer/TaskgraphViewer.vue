<script setup lang="ts">
// ComponentPublicInstance 型をインポート
import { onMounted, defineProps, watch, ref, onBeforeUpdate } from 'vue';

import type { EditorTask } from '../../model/EditorTask';
import { useCurrentTasks } from '../../store/task_store';
import { useGraphExport } from '../../store/use_graph_export';

import TaskDetail from './TaskDetail.vue';

const props = defineProps<{
  editorTasks: EditorTask[];
}>();

const taskStore = useCurrentTasks();
const graphRef = ref<HTMLElement | null>(null);
const isExporting = ref(false);

const triggerElementRefs = ref<Map<string, HTMLElement>>(new Map());

onBeforeUpdate(() => {
  triggerElementRefs.value.clear();
});

onMounted(() => {
  taskStore.buildGraphData();
});

watch(
  () => props.editorTasks,
  () => {
    taskStore.buildGraphData();
  },
  { deep: true },
);

const { setGraphRef, exportAsSvg } = useGraphExport();

const exportSvg = () => {
  setGraphRef(graphRef.value);
  exportAsSvg();
};

const dropdownOptions = {
  triggers: ['hover', 'focus'],
  delay: { show: 200, hide: 100 },
  placement: 'auto',
};
</script>

<template>
  <div>
    <div class="flex justify-end mb-4 gap-2">
      <button
        @click="exportSvg"
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

        <VDropdown
          v-for="node in taskStore.graphNodes"
          :key="node.id"
          :lazy="true"
          v-bind="dropdownOptions"
          :aria-id="`tooltip-for-${node.id}`"
          class="absolute"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
          }"
        >
          <div
            class="border-2 rounded-lg p-3 shadow-md transition-transform hover:translate-y-[-2px] hover:shadow-lg cursor-pointer bg-opacity-90 w-full h-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
            :class="taskStore.getDifficultyColor(node.difficulty)"
            :style="{
              width: `${taskStore.GRAPH_SETTINGS.nodeWidth}px`,
              height: `${taskStore.GRAPH_SETTINGS.nodeHeight}px`,
            }"
            @click="taskStore.selectTask(node.id)"
            role="button"
            tabindex="0"
            :aria-describedby="`tooltip-for-${node.id}`"
          >
            <div class="font-bold truncate text-sm">{{ node.name }}</div>
            <div class="text-xs mt-1 truncate text-gray-700">
              {{ node.description }}
            </div>
            <div class="text-xs mt-2 font-medium">
              {{ node.category || `難易度: ${node.difficulty}` }}
              <span v-if="node.category" class="text-gray-600 font-normal">({{ node.difficulty }})</span>
            </div>
          </div>

          <template #popper>
            <TaskDetail
              v-if="taskStore.getTaskById(node.id)"
              :task="taskStore.getTaskById(node.id)!"
            />
            <div v-else class="p-2 bg-red-100 text-red-700 text-xs">
              詳細情報取得エラー
            </div>
          </template>
        </VDropdown>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... (既存のスタイル) ... */

:deep(.v-popper__inner) {
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}
:deep(.v-popper__arrow-container) {
  display: none;
}
</style>
