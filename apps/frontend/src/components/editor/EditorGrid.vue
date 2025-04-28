<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { GridTask } from '../../model/GridTask';
import { useCurrentTasks } from '../../store/task_store';

import Curve, { type Connection } from './Curve.vue';
import TaskAddButton from './TaskAddButton.vue';
import TaskAddPanel from './TaskAddPanel.vue';
import TaskCard from './TaskCard.vue';
import TaskDetailDialog from './TaskDetailDialog.vue';

defineProps<{
  selecting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selecting', value: boolean): void;
}>();

const taskStore = useCurrentTasks();
const layout = ref<GridTask[]>([]);
const showAddPanel = ref(false);

// 矢印描画用: 依存関係のペアを取得
type Arrow = {
  fromId: string;
  toId: string;
};

const arrows = ref<Arrow[]>([]);

// Curve.vueに渡すconnections配列
const connections = computed<Connection[]>(() => {
  return arrows.value.map((arrow) => ({
    sourceId: `source-${arrow.fromId}`,
    targetId: `target-${arrow.toId}`,
    color: '#94a3b8',
    strokeWidth: 1.5,
    interval: 100, // 更新間隔（ミリ秒）
  }));
});

// グリッドレイアウト初期化
onMounted(() => {
  layout.value = taskStore.gridTasks;

  // タスクグラフの初期構築
  taskStore.buildGraphData();
});

// タスク数の変化を監視してレイアウトを更新
watch(
  () => taskStore.editorTasks.length,
  () => {
    layout.value = taskStore.gridTasks;
  },
);

// レイアウト更新時の処理
const handleLayoutUpdated = (newLayout: GridTask[]) => {
  newLayout.forEach((item) => {
    taskStore.updateGridTask(item.i, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    });
  });
};

// タスク追加ボタンのクリックハンドラ
const handleAddTask = () => {
  taskStore.addTask();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
};

// タスク追加パネルの切り替え
const toggleAddPanel = () => {
  showAddPanel.value = !showAddPanel.value;
};

// 依存関係から矢印ペアを生成
const updateArrows = () => {
  const result: Arrow[] = [];
  for (const task of taskStore.editorTasks) {
    const fromId = task.id;
    for (const dep of task.task.depends) {
      if (!dep) continue;
      const depTask = taskStore.editorTasks.find((t) => t.task.name === dep);
      if (depTask) {
        result.push({ fromId, toId: depTask.id });
      }
    }
  }
  arrows.value = result;
};

// タスクやレイアウトが変わったら再計算
watch(
  () => [
    taskStore.editorTasks.map((t) => t.id + t.task.depends.join(',')),
    layout.value,
  ],
  () => {
    updateArrows();
  },
  { immediate: true, deep: true },
);

onMounted(() => {
  updateArrows();
});

// 選択状態の監視（選択されたらselecting=trueに設定）
watch(
  () => taskStore.selectedTask?.id,
  (newSelectedId) => {
    emit('update:selecting', !!newSelectedId);
  },
);
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <!-- 矢印SVGレイヤー -->
      <div class="absolute inset-0 pointer-events-none z-10">
        <Curve :connections="connections" />
      </div>
      <h3 class="font-semibold">タスクグリッドエディター</h3>
      <div class="flex gap-2">
        <button
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
          @click="toggleAddPanel"
        >
          パネルで追加
        </button>
        <TaskAddButton @click="handleAddTask" />
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4 relative">
      <!-- 新規タスク追加パネル -->
      <TaskAddPanel v-if="showAddPanel" @close="showAddPanel = false" />

      <!-- グリッドレイアウト -->
      <GridLayout
        v-model:layout="layout"
        :col-num="12"
        :row-height="50"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="false"
        :use-css-transforms="true"
        :margin="[10, 10]"
        drag-handle=".drag-handle"
        @layout-updated="handleLayoutUpdated"
        class="min-h-[600px]"
      >
        <GridItem
          v-for="task in taskStore.editorTasks"
          :key="task.id"
          :i="task.id"
          :x="task.grid.x"
          :y="task.grid.y"
          :w="task.grid.w"
          :h="task.grid.h"
          :min-w="2"
          :min-h="2"
          drag-ignore-from=".task-content"
        >
          <TaskCard :task="task.task" :id="task.id" />
        </GridItem>
      </GridLayout>
    </div>

    <!-- タスク詳細ダイアログ -->
    <TaskDetailDialog />
  </div>
</template>

<style scoped>
.vue-grid-item:not(.vue-grid-placeholder) {
  background: #fff;
  border-radius: 0.5rem;
}

.vue-grid-item.vue-grid-placeholder {
  background: #e2e8f0;
  opacity: 0.5;
  border-radius: 0.5rem;
}

.vue-grid-item.resizing {
  opacity: 0.9;
}

.vue-grid-item.dragging {
  opacity: 0.7;
  z-index: 10;
}
</style>
