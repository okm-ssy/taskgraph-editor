<template>
  <div class="h-full flex flex-col">
    <div :class="[
      'flex justify-between items-center border-b bg-gray-50 transition-all duration-200',
      isMinimalHeader ? 'p-1' : 'p-3'
    ]">
      <div class="flex items-center gap-4">
        <h3 :class="[
          'font-semibold transition-all duration-200',
          isMinimalHeader ? 'text-sm' : ''
        ]">タスクグリッドエディター</h3>
        <div v-if="editorTasks.length > 0 && !isMinimalHeader" class="text-sm text-gray-600">
          <span class="font-medium">総工数: {{ totalDifficulty }}</span>
          <span class="ml-3 text-blue-600"
            >クリティカルパス: {{ criticalTaskNames.length }}タスク</span
          >
          <span class="ml-3 font-medium">最低工数: {{ projectDuration }}</span>
        </div>
        <!-- 最小化モード時の簡潔な情報表示 -->
        <div v-if="editorTasks.length > 0 && isMinimalHeader" class="text-xs text-gray-600">
          工数:{{ Math.round(totalDifficulty * 10) / 10 }} | 最低:{{ Math.round(projectDuration * 10) / 10 }} | CP:{{ criticalTaskNames.length }}
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
          @click="handleAutoLayout"
          :disabled="editorTasks.length === 0"
        >
          自動配置
        </button>
        <button
          :class="[
            'px-3 py-1 rounded-md text-sm transition-colors',
            isCompactMode
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          ]"
          @click="toggleCompactMode"
        >
          {{ isCompactMode ? 'コンパクト中' : 'コンパクト' }}
        </button>
        <button
          :class="[
            'px-3 py-1 rounded-md text-sm transition-colors',
            isMinimalHeader
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          ]"
          @click="toggleMinimalHeader"
        >
          {{ isMinimalHeader ? 'ヘッダー最小中' : 'ヘッダー最小' }}
        </button>
        <button
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
          @click="toggleAddPanel"
        >
          パネルで追加
        </button>
        <TaskAddButton @click="handleAddTask" />
      </div>
    </div>

    <div ref="gridContainer" class="flex-1 overflow-auto p-4 relative">
      <!-- 矢印SVGレイヤー（タスクカードより奥に配置） -->
      <div class="absolute inset-0 z-0">
        <Curve
          :connections="connections"
          :force-update="curveUpdateTrigger"
          :continuous-update="false"
          :is-dragging="isDraggingOrResizing"
          :hovered-connection-key="hoveredConnectionKey"
          :grid-bounds="gridBounds"
          @connection-click="handleConnectionClick"
          @connection-hover="handleConnectionHover"
        />
      </div>

      <!-- 矢印クリック用の透明レイヤー（タスクより下） -->
      <div class="absolute inset-0 z-5 pointer-events-none">
        <Curve
          :connections="connections"
          :force-update="curveUpdateTrigger"
          :continuous-update="false"
          :is-dragging="isDraggingOrResizing"
          :click-layer-only="true"
          :hovered-connection-key="hoveredConnectionKey"
          :grid-bounds="gridBounds"
          @connection-click="handleConnectionClick"
          @connection-hover="handleConnectionHover"
        />
      </div>
      <!-- 新規タスク追加パネル -->
      <TaskAddPanel
        v-if="uiStore.showAddPanel"
        @close="uiStore.toggleAddPanel"
      />

      <!-- グリッドレイアウト -->
      <GridLayout
        v-model:layout="layout"
        :col-num="isCompactMode ? 16 : 12"
        :row-height="isCompactMode ? 35 : 50"
        :is-draggable="!disableGrid"
        :is-resizable="!disableGrid"
        :vertical-compact="false"
        :use-css-transforms="true"
        :margin="isCompactMode ? [5, 5] : [10, 10]"
        :responsive="false"
        :auto-size="false"
        :prevent-collision="false"
        :compact-type="null"
        :transform-scale="1"
        :mirrored="false"
        :use-style-cursor="false"
        drag-handle=".drag-handle"
        @layout-updated="handleLayoutUpdated"
        @item-move="handleItemMove"
        @item-moved="handleItemMoved"
        @item-resize="handleItemResize"
        @item-resized="handleItemResized"
        class="min-h-[600px]"
        :class="{ 'grid-disabled': disableGrid }"
      >
        <GridItem
          v-for="task in editorTasks"
          :key="task.id"
          :i="task.id"
          :x="task.grid.x"
          :y="task.grid.y"
          :w="task.grid.w"
          :h="task.grid.h"
          :min-w="2"
          :min-h="2"
          drag-ignore-from=".task-content, .dependency-handle, .task-action-button"
        >
          <TaskCard :task="task.task" :id="task.id" :compact="isCompactMode" />
        </GridItem>
      </GridLayout>
    </div>

    <!-- タスク詳細ダイアログ -->
    <TaskDetailDialog />

    <!-- エラー表示 -->
    <ErrorDisplay />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  watch,
  computed,
  nextTick,
  onBeforeUnmount,
  toRefs,
} from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useTaskActionsProvider } from '../../composables/useTaskActions';
import { GridTask } from '../../model/GridTask';
import { useDragDropStore } from '../../store/drag_drop_store';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import ErrorDisplay from '../common/ErrorDisplay.vue';

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
const dragDropStore = useDragDropStore();
const layout = ref<GridTask[]>([]);
const gridContainer = ref<HTMLDivElement | null>(null);

// 表示モード管理
const isCompactMode = ref(false);
const isMinimalHeader = ref(false);

// provide/injectでコンポーネント通信を改善
const taskActions = useTaskActionsProvider();

// storeからtoRefsで値を取得
const {
  editorTasks,
  totalDifficulty,
  criticalPath,
  projectDuration,
  criticalTaskNames,
  dependencyEdges,
} = toRefs(taskStore);

// 矢印描画用: 依存関係のペアを取得
type Arrow = {
  fromId: string;
  toId: string;
};

const arrows = ref<Arrow[]>([]);
const curveUpdateTrigger = ref(0);
const isDraggingOrResizing = ref(false);
const disableGrid = ref(false);
const hoveredConnectionKey = ref<string | null>(null);

// グリッド全体のサイズを計算
const gridBounds = computed(() => {
  if (layout.value.length === 0) {
    return { width: 800, height: 600 }; // デフォルトサイズ
  }
  
  let maxX = 0;
  let maxY = 0;
  
  layout.value.forEach((item) => {
    const itemRightEdge = (item.x + item.w) * 160; // グリッドセルの幅（概算）
    const itemBottomEdge = (item.y + item.h) * 60; // グリッドセルの高さ（概算）
    
    if (itemRightEdge > maxX) maxX = itemRightEdge;
    if (itemBottomEdge > maxY) maxY = itemBottomEdge;
  });
  
  // 余白を追加
  return {
    width: Math.max(maxX + 200, 800),
    height: Math.max(maxY + 200, 600),
  };
});

// Curve.vueに渡すconnections配列（仮矢印は除外）
const connections = computed<Connection[]>(() => {
  return arrows.value.map((arrow) => {
    // クリティカルパス上の矢印かチェック
    const isCritical = criticalPath.value.some(
      (edge) =>
        edge.fromTaskId === arrow.fromId && edge.toTaskId === arrow.toId,
    );

    return {
      sourceId: `source-${arrow.fromId}`,
      targetId: `target-${arrow.toId}`,
      color: isCritical ? '#2563eb' : '#94a3b8', // クリティカルパスは青色
      strokeWidth: isCritical ? 2.5 : 1.5, // クリティカルパスは太く
      interval: 10, // 更新間隔（ミリ秒）
    };
  });
});

const triggerCurveUpdate = () => {
  // ドラッグ中は矢印更新をスキップ
  if (isDraggingOrResizing.value) {
    return;
  }

  nextTick(() => {
    setTimeout(() => {
      curveUpdateTrigger.value++;
    }, 10);
  });
};

// レイアウト更新時の処理（グリッド有効時のみ）
const handleLayoutUpdated = (newLayout: GridTask[]) => {
  if (disableGrid.value) return; // グリッド無効時はスキップ

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

const handleItemMove = () => {
  // ドラッグ中は矢印更新を完全停止
  isDraggingOrResizing.value = true;
  // グリッドを無効化してパフォーマンス向上
  disableGrid.value = true;
};

const handleItemMoved = () => {
  // ドラッグ完了時にグリッドを復帰
  setTimeout(() => {
    disableGrid.value = false;
    isDraggingOrResizing.value = false;
    triggerCurveUpdate();
    triggerCurveUpdate(); // 2回実行で確実に
  }, 100);
};

const handleItemResize = () => {
  // リサイズ中もグリッドを無効化
  isDraggingOrResizing.value = true;
  disableGrid.value = true;
};

const handleItemResized = () => {
  // リサイズ完了時にグリッドを復帰
  setTimeout(() => {
    disableGrid.value = false;
    isDraggingOrResizing.value = false;
    triggerCurveUpdate();
    triggerCurveUpdate(); // 2回実行で確実に
  }, 100);
};

// タスク追加ボタンのクリックハンドラ
const handleAddTask = () => {
  taskActions.addTask();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
};

// コンパクトモードの切り替え
const toggleCompactMode = () => {
  isCompactMode.value = !isCompactMode.value;
  triggerCurveUpdate();
};

// ヘッダー最小化モードの切り替え
const toggleMinimalHeader = () => {
  isMinimalHeader.value = !isMinimalHeader.value;
};

// タスク追加パネルの切り替え
const toggleAddPanel = () => {
  uiStore.toggleAddPanel();
};

// 自動配置の実行
const handleAutoLayout = () => {
  taskStore.autoLayoutTasks();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
  // Curve更新をトリガー
  triggerCurveUpdate();
};

// 依存関係エッジから矢印ペアを生成
const updateArrows = () => {
  const newArrows: Arrow[] = [];
  
  // 各タスクの依存関係から矢印を生成
  editorTasks.value.forEach((task) => {
    task.task.depends.forEach((dependencyName) => {
      if (dependencyName.trim() !== '') {
        // 依存するタスクを見つける
        const dependencyTask = editorTasks.value.find(
          (t) => t.task.name === dependencyName
        );
        if (dependencyTask) {
          newArrows.push({
            fromId: dependencyTask.id, // 依存元のタスク
            toId: task.id, // 依存先のタスク（現在のタスク）
          });
        }
      }
    });
  });
  
  arrows.value = newArrows;
};

// タスクやレイアウトが変わったら再計算
watch(
  () => [editorTasks.value, layout.value],
  () => {
    updateArrows();
  },
  { immediate: true, deep: true },
);

onMounted(() => {
  layout.value = taskStore.gridTasks;
  taskStore.buildGraphData();
  updateArrows();
  document.addEventListener('mousemove', handleMouseMove);

  // 初期描画のために複数回更新をトリガー
  nextTick(() => {
    triggerCurveUpdate();
    setTimeout(() => {
      triggerCurveUpdate();
    }, 100);
    setTimeout(() => {
      triggerCurveUpdate();
    }, 300);
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove);
});

watch(
  () => editorTasks.value.length,
  () => {
    layout.value = taskStore.gridTasks;
  },
);

// マウス移動ハンドラ（ドラッグ中のマウス位置を追跡）
const handleMouseMove = (event: MouseEvent) => {
  if (dragDropStore.isDragging && gridContainer.value) {
    const rect = gridContainer.value.getBoundingClientRect();
    dragDropStore.updateDragPosition(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }
};

// 依存関係クリック時の処理（削除）
const handleConnectionClick = (connection: Connection) => {
  // source と target の ID から実際のタスクを特定
  const sourceTaskId = connection.sourceId.replace('source-', '');
  const targetTaskId = connection.targetId.replace('target-', '');

  const sourceTask = taskStore.getTaskById(sourceTaskId);
  const targetTask = taskStore.getTaskById(targetTaskId);

  if (sourceTask && targetTask) {
    // sourceTask が targetTask に依存している
    // つまり、targetTask.depends から sourceTask.name を削除
    const newDepends = targetTask.task.depends.filter(
      (dep) => dep !== sourceTask.task.name,
    );

    if (
      confirm(
        `「${targetTask.task.name}」から「${sourceTask.task.name}」への依存を削除しますか？`,
      )
    ) {
      taskStore.updateTask(targetTaskId, { depends: newDepends });
    }
  }
};

// 依存関係ホバー時の処理
const handleConnectionHover = (connectionKey: string | null) => {
  hoveredConnectionKey.value = connectionKey;
};

// 選択状態の監視（選択されたらselecting=trueに設定）
watch(
  () => uiStore.selectedTaskId,
  (newSelectedId) => {
    emit('update:selecting', !!newSelectedId);
  },
);
</script>

<style scoped>
.vue-grid-item:not(.vue-grid-placeholder) {
  background: #fff;
  border-radius: 0.5rem;
  /* トランジションを無効化（カクカクの原因） */
  transition: none;
}

.vue-grid-item.vue-grid-placeholder {
  background: #e2e8f0;
  opacity: 0.5;
  border-radius: 0.5rem;
}

.vue-grid-item.resizing {
  opacity: 0.9;
  transition: none !important;
}

.vue-grid-item.dragging {
  opacity: 0.7;
  z-index: 10;
  transition: none !important;
  /* ドラッグ中は最大限最適化 */
  will-change: transform;
  transform: translateZ(0);
}

/* ドラッグ・リサイズ時のパフォーマンス最適化 */
.vue-grid-item {
  will-change: transform;
  /* GPU層分離でドラッグ性能向上 */
  transform: translateZ(0);
  /* タスクカードを矢印より手前に配置 */
  position: relative;
  z-index: 10;
}

.vue-grid-item.dragging {
  /* ドラッグ中はより積極的にGPU最適化 */
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.vue-grid-item.resizing {
  /* リサイズ中もGPU最適化 */
  will-change: transform, width, height;
  transform: translateZ(0);
}

/* グリッド無効化時のスタイル */
.grid-disabled {
  /* グリッド全体でアニメーションを無効化 */
  * {
    transition: none !important;
    animation: none !important;
  }
}

.grid-disabled .vue-grid-item {
  transition: none !important;
  animation: none !important;
  will-change: transform;
  contain: strict;
}
</style>
