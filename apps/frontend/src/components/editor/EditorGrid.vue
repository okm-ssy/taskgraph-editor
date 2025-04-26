<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useCurrentTasks } from '../../store/task_store';

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
const layout = ref([]);
const showAddPanel = ref(false);

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
const handleLayoutUpdated = (newLayout) => {
  newLayout.forEach((item) => {
    taskStore.updateGridTask(item.i, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    });
  });
};

// タスク選択のハンドラ
const handleTaskSelect = (id: string) => {
  emit('update:selecting', true);
  taskStore.selectTask(id);
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
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
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
        >
          <TaskCard
            :task="task.task"
            :id="task.id"
            @click="handleTaskSelect(task.id)"
          />
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
