<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useTaskActionsProvider } from '../../composables/useTaskActions';
import { GridTask } from '../../model/GridTask';
import { useEditorUIStore } from '../../store/editor_ui_store';
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
const uiStore = useEditorUIStore();
const layout = ref<GridTask[]>([]);

// provide/injectでコンポーネント通信を改善
const taskActions = useTaskActionsProvider();

// 矢印描画用: 依存関係のペアを取得
type Arrow = {
  fromId: string;
  toId: string;
};

const arrows = ref<Arrow[]>([]);
const curveUpdateTrigger = ref(0);

// Curve.vueに渡すconnections配列
const connections = computed<Connection[]>(() => {
  return arrows.value.map((arrow) => ({
    sourceId: `source-${arrow.fromId}`,
    targetId: `target-${arrow.toId}`,
    color: '#94a3b8',
    strokeWidth: 1.5,
    interval: 10, // 更新間隔（ミリ秒）
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

// nextTickを使った遅延実行でCurve更新
const triggerCurveUpdate = () => {
  // DOM更新を待ってからCurve更新
  nextTick(() => {
    // さらに少し遅延してCSS Transform完了を待つ
    setTimeout(() => {
      curveUpdateTrigger.value++;
    }, 10);
  });
};

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
  triggerCurveUpdate();
};

// より細かなイベント処理
const handleLayoutChange = (newLayout: GridTask[]) => {
  layout.value = newLayout;
  triggerCurveUpdate();
};

const handleItemMove = () => {
  // ドラッグ中の連続更新（パフォーマンス重視）
  triggerCurveUpdate();
};

const handleItemMoved = () => {
  // ドラッグ完了時の確実な更新
  triggerCurveUpdate();
};

const handleItemResize = () => {
  // リサイズ中の連続更新
  triggerCurveUpdate();
};

const handleItemResized = () => {
  // リサイズ完了時の確実な更新
  triggerCurveUpdate();
};

// タスク追加ボタンのクリックハンドラ
const handleAddTask = () => {
  taskActions.addTask();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
};

// タスク追加パネルの切り替え
const toggleAddPanel = () => {
  uiStore.toggleAddPanel();
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
  () => uiStore.selectedTaskId,
  (newSelectedId) => {
    emit('update:selecting', !!newSelectedId);
  },
);
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center p-3 border-b bg-gray-50">
      <!-- 矢印SVGレイヤー -->
      <div class="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <Curve :connections="connections" :force-update="curveUpdateTrigger" />
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
      <TaskAddPanel
        v-if="uiStore.showAddPanel"
        @close="uiStore.toggleAddPanel"
      />

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
        @update:layout="handleLayoutChange"
        @item-move="handleItemMove"
        @item-moved="handleItemMoved"
        @item-resize="handleItemResize"
        @item-resized="handleItemResized"
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
