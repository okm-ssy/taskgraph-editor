<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center border-b bg-gray-50 p-3 h-16">
      <div class="flex items-center gap-4">
        <h3 class="font-semibold">タスクグリッドエディター</h3>
        <div v-if="editorTasks.length > 0" class="text-sm text-gray-600">
          <span class="font-medium"
            >総工数: {{ totalDifficulty.toFixed(2) }}h</span
          >
          <span
            v-if="completedDifficulty > 0"
            class="font-medium ml-3 text-green-600"
            >終了: {{ completedDifficulty.toFixed(2) }}h</span
          >
        </div>
      </div>
      <div class="flex gap-2 min-h-[2.5rem]">
        <template v-if="!props.readOnly">
          <button
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
            @click="toggleAddPanel"
          >
            パネルで追加
          </button>
          <TaskAddButton @click="handleAddTask" />
          <button
            v-if="!props.readOnly"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center"
            @click="handleAutoLayoutByDepth"
            :disabled="taskStore.taskCount === 0"
            :title="
              taskStore.taskCount === 0
                ? 'タスクがありません'
                : 'depth順に自動配置'
            "
          >
            <span class="mr-1">⚙</span>
            <span>自動配置</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 自動配置undo情報表示 -->
    <div
      v-if="taskStore.layoutUndoState.canUndo"
      class="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm text-blue-800 flex items-center justify-between"
    >
      <div class="flex items-center">
        <span class="mr-2">ℹ️</span>
        <span>「整列前に戻す」で自動配置前の状態に戻せます (20秒以内)</span>
      </div>
      <button
        @click="handleUndoAutoLayout"
        class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
      >
        整列前に戻す
      </button>
    </div>

    <div
      ref="gridContainer"
      class="flex-1 overflow-auto p-4 relative"
      @click="handleGridClick"
    >
      <div
        class="min-w-max"
        :style="{
          width: LAYOUT.GRID.TOTAL_WIDTH,
          minWidth: LAYOUT.GRID.TOTAL_WIDTH,
        }"
      >
        <!-- 矢印レイヤー -->
        <template v-for="layer in curveLayerConfigs" :key="layer.name">
          <div
            :class="layer.class"
            :style="{
              width: LAYOUT.GRID.TOTAL_WIDTH,
              height: '100%',
              top: 0,
              left: 0,
            }"
          >
            <Curve
              :connections="connections"
              :force-update="curveUpdateTrigger"
              :continuous-update="false"
              :is-dragging="isDraggingOrResizing"
              :click-layer-only="layer.clickLayerOnly"
              :hovered-connection-key="hoveredConnectionKey"
              :grid-bounds="gridBounds"
              @connection-click="handleConnectionClick"
              @connection-hover="handleConnectionHover"
            />
          </div>
        </template>
        <!-- 新規タスク追加パネル -->
        <TaskAddPanel
          v-if="!props.readOnly && uiStore.showAddPanel"
          @close="uiStore.toggleAddPanel"
        />

        <!-- グリッドレイアウト -->
        <GridLayout
          v-model:layout="layout"
          :col-num="layoutConfig.colNum"
          :width="LAYOUT.GRID.TOTAL_WIDTH"
          :row-height="layoutConfig.rowHeight"
          :is-draggable="!disableGrid && !props.readOnly"
          :is-resizable="!disableGrid && !props.readOnly"
          :vertical-compact="false"
          :use-css-transforms="true"
          :margin="[LAYOUT.GRID.MARGIN.HORIZONTAL, layoutConfig.margin]"
          :responsive="false"
          :auto-size="false"
          :prevent-collision="true"
          :compact-type="null"
          :transform-scale="1"
          :mirrored="false"
          :use-style-cursor="false"
          :is-bounded="false"
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
            :w="task.grid.w || LAYOUT.GRID.ITEM_SIZE.WIDTH"
            :h="task.grid.h || LAYOUT.GRID.ITEM_SIZE.HEIGHT"
            :min-w="LAYOUT.GRID.ITEM_SIZE.MIN_WIDTH"
            :min-h="LAYOUT.GRID.ITEM_SIZE.MIN_HEIGHT"
            :max-x="LAYOUT.GRID.MAX_COL"
            :is-bounded="false"
            drag-ignore-from=".task-content, .dependency-handle, .task-action-button"
          >
            <TaskCard
              :task="task.task"
              :id="task.id"
              :compact="true"
              :read-only="props.readOnly"
            />
          </GridItem>
        </GridLayout>
      </div>

      <!-- タスク詳細ダイアログ -->
      <TaskDetailDialog :read-only="props.readOnly" />

      <!-- プロジェクト情報ダイアログ -->
      <InfoEditDialog />
    </div>

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
import { LAYOUT, TIMING } from '../../constants';
import { GridTask } from '../../model/GridTask';
import { useDragDropStore } from '../../store/drag_drop_store';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import ErrorDisplay from '../common/ErrorDisplay.vue';

import Curve, { type Connection } from './Curve.vue';
import InfoEditDialog from './InfoEditDialog.vue';
import TaskAddButton from './TaskAddButton.vue';
import TaskAddPanel from './TaskAddPanel.vue';
import TaskCard from './TaskCard.vue';
import TaskDetailDialog from './TaskDetailDialog.vue';

const props = defineProps<{
  selecting?: boolean;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selecting', value: boolean): void;
}>();

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const dragDropStore = useDragDropStore();
const layout = ref<GridTask[]>([]);
const gridContainer = ref<HTMLDivElement | null>(null);

// レイアウト設定（コンパクトモードをデフォルトに）
const layoutConfig = {
  colNum: LAYOUT.GRID.COL_NUM.COMPACT,
  rowHeight: LAYOUT.GRID.ROW_HEIGHT.COMPACT,
  margin: LAYOUT.GRID.MARGIN.COMPACT,
};

// provide/injectでコンポーネント通信を改善
const taskActions = useTaskActionsProvider();

// storeからtoRefsで値を取得
const { editorTasks, totalDifficulty, completedDifficulty } = toRefs(taskStore);

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

// Curveレイヤーの設定
const curveLayerConfigs = [
  {
    name: 'background',
    class: 'absolute z-0',
    clickLayerOnly: false,
  },
  {
    name: 'clickLayer',
    class: 'absolute z-5 pointer-events-none',
    clickLayerOnly: true,
  },
];

// グリッド全体のサイズを計算
const gridBounds = computed(() => {
  if (layout.value.length === 0) {
    return {
      width: LAYOUT.CANVAS.DEFAULT_WIDTH,
      height: LAYOUT.CANVAS.DEFAULT_HEIGHT,
    }; // デフォルトサイズ
  }

  let maxX = 0;
  let maxY = 0;

  layout.value.forEach((item) => {
    const itemRightEdge = (item.x + item.w) * LAYOUT.GRID.CELL_WIDTH;
    const itemBottomEdge = (item.y + item.h) * LAYOUT.GRID.CELL_HEIGHT;

    if (itemRightEdge > maxX) maxX = itemRightEdge;
    if (itemBottomEdge > maxY) maxY = itemBottomEdge;
  });

  // 余白を追加
  return {
    width: Math.max(maxX + LAYOUT.PADDING.EDGE, LAYOUT.CANVAS.DEFAULT_WIDTH),
    height: Math.max(maxY + LAYOUT.PADDING.EDGE, LAYOUT.CANVAS.DEFAULT_HEIGHT),
  };
});

// Curve.vueに渡すconnections配列（仮矢印は除外）
const connections = computed<Connection[]>(() => {
  return arrows.value.map((arrow) => {
    return {
      sourceId: `source-${arrow.fromId}`,
      targetId: `target-${arrow.toId}`,
      color: '#94a3b8',
      strokeWidth: 1.5,
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

// 複数回のカーブ更新をトリガー
const triggerCurveUpdateMultiple = (count: number) => {
  for (let i = 0; i < count; i++) {
    setTimeout(() => triggerCurveUpdate(), i * 10);
  }
};

// 現在のレイアウト状態を保存
const previousLayout = ref<GridTask[]>([]);

// ドラッグ検出用の状態
const isDragDetected = ref(false);

// layout の変更を監視して保存処理を実行
watch(
  () => layout.value,
  (newLayout, oldLayout) => {
    // 初期化時はスキップ
    if (!oldLayout || oldLayout.length === 0) {
      return;
    }

    // ドラッグ中でない場合のみ処理
    if (!isDraggingOrResizing.value && !isDragDetected.value) {
      // 変更されたアイテムを検出
      let foundChanges = false;

      // previousLayoutが初期化されていない場合の対応
      if (previousLayout.value.length === 0) {
        previousLayout.value = JSON.parse(JSON.stringify(newLayout));
        return;
      }

      newLayout.forEach((newItem) => {
        const oldItem = previousLayout.value.find((old) => old.i === newItem.i);

        if (oldItem && (newItem.x !== oldItem.x || newItem.y !== oldItem.y)) {
          foundChanges = true;
          taskStore.updateGridTask(newItem.i, {
            x: newItem.x,
            y: newItem.y,
            w: newItem.w,
            h: newItem.h,
          });
        }
      });

      if (foundChanges) {
        // 位置変更後にpreviousLayoutを更新
        previousLayout.value = JSON.parse(JSON.stringify(newLayout));
      }
    }
  },
  { deep: true },
);

// レイアウト更新時の処理（グリッド有効時のみ）
const handleLayoutUpdated = (_newLayout: GridTask[]) => {
  if (disableGrid.value) return;
  triggerCurveUpdate();
};

const handleItemMove = () => {
  // 移動開始時の位置を保存
  previousLayout.value = JSON.parse(JSON.stringify(layout.value));

  // ドラッグ中は矢印更新を完全停止
  isDraggingOrResizing.value = true;
  // グリッドを無効化してパフォーマンス向上
  disableGrid.value = true;
};

const handleItemMoved = (i: string, newX: number, newY: number) => {
  console.log('handleItemMoved called:', i, newX, newY);

  // previousLayoutと比較して位置変更をチェック
  const oldItem = previousLayout.value.find((item) => item.i === i);
  if (oldItem && (oldItem.x !== newX || oldItem.y !== newY)) {
    console.log('Position actually changed:', {
      from: { x: oldItem.x, y: oldItem.y },
      to: { x: newX, y: newY },
    });

    // 位置変更を保存
    const currentItem = layout.value.find((item) => item.i === i);
    if (currentItem) {
      taskStore.updateGridTask(i, {
        x: newX,
        y: newY,
        w: currentItem.w,
        h: currentItem.h,
      });
    }
  } else {
    console.log('No actual position change detected');
  }

  // ドラッグ完了時にグリッドを復帰
  setTimeout(() => {
    disableGrid.value = false;
    isDraggingOrResizing.value = false;
    triggerCurveUpdateMultiple(2);
  }, TIMING.DEBOUNCE.DEFAULT_MS);
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
    triggerCurveUpdateMultiple(2);
  }, TIMING.DEBOUNCE.DEFAULT_MS);
};

// スクロール位置を考慮したタスク追加位置の計算
const getVisibleAreaPosition = () => {
  if (!gridContainer.value) return { x: 0, y: 0 };

  const scrollTop = gridContainer.value.scrollTop;

  // スクロール位置をグリッド座標に変換（マージンも考慮）
  const gridY = Math.floor(
    scrollTop / (layoutConfig.rowHeight + layoutConfig.margin),
  );

  // X座標は左端（0）に固定
  return { x: 0, y: gridY };
};

// タスク追加ボタンのクリックハンドラ
const handleAddTask = () => {
  const position = getVisibleAreaPosition();
  taskActions.addTaskAtPosition(position.x, position.y);
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
};

// タスク追加パネルの切り替え
const toggleAddPanel = () => {
  uiStore.toggleAddPanel();
};

// depth順自動配置ボタンのクリックハンドラ
const handleAutoLayoutByDepth = () => {
  taskStore.autoLayoutByDepth();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
  // 最左端のタスクにスクロール
  scrollToLeftmostTask();
};

// 自動配置を元に戻すハンドラ
const handleUndoAutoLayout = () => {
  const success = taskStore.undoAutoLayout();
  if (success) {
    // レイアウトを更新
    layout.value = taskStore.gridTasks;
  }
};

// 最左端のタスクを表示するためのスクロール調整
const scrollToLeftmostTask = () => {
  if (!gridContainer.value || editorTasks.value.length === 0) return;

  // 最小のx座標を見つける
  const minX = Math.min(...editorTasks.value.map((task) => task.grid.x));

  // グリッドの設定値を取得
  const gridWidth = gridContainer.value.clientWidth;
  const cellWidth = gridWidth / layoutConfig.colNum;

  // 表示マージン設定
  const SCROLL_MARGIN_RATIO = 0.1; // 10%マージン

  // 最左端のタスクが見えるように水平スクロール
  const scrollLeft = Math.max(
    0,
    minX * cellWidth - gridWidth * SCROLL_MARGIN_RATIO,
  );
  gridContainer.value.scrollLeft = scrollLeft;
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
          (t) => t.task.name === dependencyName,
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
  // previousLayoutを初期化
  previousLayout.value = [...layout.value];
  taskStore.buildGraphData();
  updateArrows();
  document.addEventListener('mousemove', handleMouseMove);

  // 初期描画のために複数回更新をトリガー
  nextTick(() => {
    triggerCurveUpdateMultiple(1);
    setTimeout(() => {
      triggerCurveUpdateMultiple(1);
    }, TIMING.ANIMATION.SHORT_MS);
    setTimeout(() => {
      triggerCurveUpdateMultiple(1);
    }, TIMING.ANIMATION.MEDIUM_MS);
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove);
});

watch(
  () => editorTasks.value,
  () => {
    nextTick(() => {
      layout.value = [...taskStore.gridTasks];
      // タスクが更新されたら最左端のタスクを表示
      setTimeout(() => {
        scrollToLeftmostTask();
      }, TIMING.ANIMATION.SHORT_MS);
    });
  },
  { deep: true, immediate: true },
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
  // readOnlyモードでは何もしない
  if (props.readOnly) return;

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

const handleGridClick = (event: MouseEvent) => {
  // タスクカード以外をクリックしたら選択解除（ただし詳細ダイアログ内は除く）
  const clickedElement = event.target as HTMLElement;
  const isTaskCard = clickedElement.closest('.vue-grid-item');
  const isDetailDialog = clickedElement.closest('#task-detail-dialog-overlay');

  if (!isTaskCard && !isDetailDialog) {
    uiStore.clearBulkSelection();
    uiStore.clearSelection();
  }
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
