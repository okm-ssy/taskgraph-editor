<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useCurrentTasks } from '../../store/task_store';

import Curve from './Curve.vue';
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

// 矢印描画用: 依存関係のペアを取得
type Arrow = {
  fromId: string;
  toId: string;
};

const arrows = ref<Arrow[]>([]);
const arrowPositions = ref<
  {
    from: { x: number; y: number };
    to: { x: number; y: number };
  }[]
>([]);

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

// DOM座標取得
const updateArrowPositions = () => {
  nextTick(() => {
    const container = document.querySelector(
      '.flex-1.overflow-auto.p-4.relative',
    ) as HTMLElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const positions = arrows.value
      .map(({ fromId, toId }) => {
        const fromEl = document.getElementById(`source-${fromId}`);
        const toEl = document.getElementById(`target-${toId}`);
        if (!fromEl || !toEl) return null;
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        // スクロール位置も考慮して補正
        return {
          from: {
            x:
              fromRect.left +
              fromRect.width / 2 -
              containerRect.left +
              scrollLeft,
            y:
              fromRect.top +
              fromRect.height / 2 -
              containerRect.top +
              scrollTop,
          },
          to: {
            x: toRect.left + toRect.width / 2 - containerRect.left + scrollLeft,
            y: toRect.top + toRect.height / 2 - containerRect.top + scrollTop,
          },
        };
      })
      .filter(Boolean) as {
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[];
    arrowPositions.value = positions;
  });
};

// タスクやレイアウトが変わったら再計算
watch(
  () => [
    taskStore.editorTasks.map((t) => t.id + t.task.depends.join(',')),
    layout.value,
  ],
  () => {
    updateArrows();
    updateArrowPositions();
  },
  { immediate: true, deep: true },
);

// リサイズ時も再計算
window.addEventListener('resize', updateArrowPositions);

onMounted(() => {
  updateArrows();
  updateArrowPositions();
});
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
      <!-- 矢印SVGレイヤー -->
      <svg class="absolute left-0 top-0 w-full h-full pointer-events-none z-10">
        <Curve
          v-for="(arrow, idx) in arrowPositions"
          :key="idx"
          :start="arrow.from"
          :end="arrow.to"
        />
      </svg>

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
