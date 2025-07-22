<template>
  <div class="h-full flex flex-col">
    <div
      :class="[
        'flex justify-between items-center border-b bg-gray-50 transition-all duration-200',
        isMinimalHeader ? 'p-1' : 'p-3',
      ]"
    >
      <div class="flex items-center gap-4">
        <h3
          :class="[
            'font-semibold transition-all duration-200',
            isMinimalHeader ? 'text-sm' : '',
          ]"
        >
          タスクグリッドエディター
        </h3>
        <div
          v-if="editorTasks.length > 0 && !isMinimalHeader"
          class="text-sm text-gray-600"
        >
          <span class="font-medium">総工数: {{ totalDifficulty }}</span>
        </div>
        <!-- 最小化モード時の簡潔な情報表示 -->
        <div
          v-if="editorTasks.length > 0 && isMinimalHeader"
          class="text-xs text-gray-600"
        >
          工数:{{ Math.round(totalDifficulty * 10) / 10 }}
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
          @click="handleExport"
          :disabled="editorTasks.length === 0"
          title="MCPサーバー用にエクスポート"
        >
          Export
        </button>
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
          @click="handleAutoLayout"
          :disabled="editorTasks.length === 0"
        >
          自動配置
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

    <div
      ref="gridContainer"
      class="flex-1 overflow-auto p-4 relative"
      @mousedown="handleGridMouseDown"
      @mousemove="handleGridMouseMove"
      @mouseup="handleGridMouseUp"
      @click="handleGridClick"
    >
      <div
        class="min-w-max"
        :style="{
          width: LAYOUT.GRID.TOTAL_WIDTH,
          minWidth: LAYOUT.GRID.TOTAL_WIDTH,
        }"
      >
        <!-- 矢印SVGレイヤー（タスクカードより奥に配置） -->
        <div
          class="absolute z-0"
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
            :hovered-connection-key="hoveredConnectionKey"
            :grid-bounds="gridBounds"
            @connection-click="handleConnectionClick"
            @connection-hover="handleConnectionHover"
          />
        </div>

        <!-- ドラッグ選択矩形 -->
        <div
          v-if="uiStore.isDragSelecting && uiStore.dragSelectionRect"
          class="absolute pointer-events-none z-30 border-2 border-blue-500 bg-blue-500/20 rounded"
          :style="selectionRectStyle"
        />

        <!-- 矢印クリック用の透明レイヤー（タスクより下） -->
        <div
          class="absolute z-5 pointer-events-none"
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
          :col-num="
            isCompactMode
              ? LAYOUT.GRID.COL_NUM.COMPACT
              : LAYOUT.GRID.COL_NUM.NORMAL
          "
          :width="LAYOUT.GRID.TOTAL_WIDTH"
          :row-height="
            isCompactMode
              ? LAYOUT.GRID.ROW_HEIGHT.COMPACT
              : LAYOUT.GRID.ROW_HEIGHT.NORMAL
          "
          :is-draggable="!disableGrid"
          :is-resizable="!disableGrid"
          :vertical-compact="false"
          :use-css-transforms="true"
          :margin="
            isCompactMode
              ? [LAYOUT.GRID.MARGIN.COMPACT, LAYOUT.GRID.MARGIN.COMPACT]
              : [LAYOUT.GRID.MARGIN.NORMAL, LAYOUT.GRID.MARGIN.NORMAL]
          "
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
              :compact="isCompactMode"
            />
          </GridItem>
        </GridLayout>
      </div>

      <!-- タスク詳細ダイアログ -->
      <TaskDetailDialog />
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

import { useFileStorageSync } from '../../composables/useFileStorageSync';
import { useTaskActionsProvider } from '../../composables/useTaskActions';
import { LAYOUT, TIMING } from '../../constants';
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

const props = defineProps<{
  selecting?: boolean;
  compactMode?: boolean;
  minimalHeader?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selecting', value: boolean): void;
  (e: 'update:minimal-header', value: boolean): void;
}>();

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const dragDropStore = useDragDropStore();
const layout = ref<GridTask[]>([]);
const gridContainer = ref<HTMLDivElement | null>(null);

// 表示モード管理（propsから取得）
const isCompactMode = computed(() => props.compactMode ?? false);
const isMinimalHeader = computed(() => props.minimalHeader ?? false);

// provide/injectでコンポーネント通信を改善
const taskActions = useTaskActionsProvider();

// storeからtoRefsで値を取得
const { editorTasks, totalDifficulty } = toRefs(taskStore);

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

// ドラッグ選択用の状態
const dragStartPoint = ref<{ x: number; y: number } | null>(null);

// 選択矩形のスタイル計算
const selectionRectStyle = computed(() => {
  if (!uiStore.dragSelectionRect) return {};

  const rect = uiStore.dragSelectionRect;
  const left = Math.min(rect.startX, rect.endX);
  const top = Math.min(rect.startY, rect.endY);
  const width = Math.abs(rect.endX - rect.startX);
  const height = Math.abs(rect.endY - rect.startY);

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

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
    const itemRightEdge = (item.x + item.w) * 160; // グリッドセルの幅（概算）
    const itemBottomEdge = (item.y + item.h) * 60; // グリッドセルの高さ（概算）

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

// レイアウト更新時の処理（グリッド有効時のみ）
const handleLayoutUpdated = (newLayout: GridTask[]) => {
  if (disableGrid.value) return;

  // バルク移動の処理
  if (uiStore.selectedTaskIds.size > 1) {
    const updatesApplied = new Set<string>();

    newLayout.forEach((item) => {
      if (updatesApplied.has(item.i)) return;

      const oldItem = layout.value.find((old) => old.i === item.i);
      if (!oldItem) return;

      // 移動量を計算
      const deltaX = item.x - oldItem.x;
      const deltaY = item.y - oldItem.y;

      // この項目が選択されていて、実際に移動した場合
      if (
        uiStore.selectedTaskIds.has(item.i) &&
        (deltaX !== 0 || deltaY !== 0)
      ) {
        // 選択されている全てのタスクを同じ距離だけ移動
        uiStore.selectedTaskIds.forEach((taskId) => {
          const currentItem = layout.value.find((l) => l.i === taskId);
          if (currentItem && !updatesApplied.has(taskId)) {
            const newX = currentItem.x + deltaX;
            const newY = currentItem.y + deltaY;

            // 境界チェック
            if (
              newX >= 0 &&
              newY >= 0 &&
              newX + currentItem.w <= LAYOUT.GRID.MAX_COL &&
              newY + currentItem.h <= LAYOUT.GRID.MAX_ROW
            ) {
              taskStore.updateGridTask(taskId, {
                x: newX,
                y: newY,
                w: currentItem.w,
                h: currentItem.h,
              });
              updatesApplied.add(taskId);
            }
          }
        });
        return; // バルク移動処理完了
      }
    });

    // 個別更新が必要な項目のみ処理
    newLayout.forEach((item) => {
      if (!updatesApplied.has(item.i)) {
        taskStore.updateGridTask(item.i, {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        });
      }
    });
  } else {
    // 通常の単一移動処理
    newLayout.forEach((item) => {
      taskStore.updateGridTask(item.i, {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
    });
  }

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
    triggerCurveUpdate();
    triggerCurveUpdate(); // 2回実行で確実に
  }, TIMING.DEBOUNCE.DEFAULT_MS);
};

// スクロール位置を考慮したタスク追加位置の計算
const getVisibleAreaPosition = () => {
  if (!gridContainer.value) return { x: 0, y: 0 };

  const scrollTop = gridContainer.value.scrollTop;

  // GridLayoutの実際の設定値を使用
  const rowHeight = isCompactMode.value
    ? LAYOUT.GRID.ROW_HEIGHT.COMPACT
    : LAYOUT.GRID.ROW_HEIGHT.NORMAL;
  const margin = isCompactMode.value
    ? LAYOUT.GRID.MARGIN.COMPACT
    : LAYOUT.GRID.MARGIN.NORMAL;

  // スクロール位置をグリッド座標に変換（マージンも考慮）
  const gridY = Math.floor(scrollTop / (rowHeight + margin));

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

// LocalStorage同期機能
const { exportToFile } = useFileStorageSync();

// エクスポート処理
const handleExport = async () => {
  const success = await exportToFile();
  if (success) {
    // 成功通知などを表示することもできます
    console.log('Taskgraph exported successfully');
  }
};

// 自動配置の実行
const handleAutoLayout = () => {
  taskStore.autoLayoutTasks();
  // レイアウトを更新
  layout.value = taskStore.gridTasks;
  // Curve更新をトリガー
  triggerCurveUpdate();
};

// 最左端のタスクを表示するためのスクロール調整
const scrollToLeftmostTask = () => {
  if (!gridContainer.value || editorTasks.value.length === 0) return;

  // 最小のx座標を見つける
  const minX = Math.min(...editorTasks.value.map((task) => task.grid.x));

  // グリッドの設定値を取得
  const colNum = isCompactMode.value
    ? LAYOUT.GRID.COL_NUM.COMPACT
    : LAYOUT.GRID.COL_NUM.NORMAL;
  const gridWidth = gridContainer.value.clientWidth;
  const cellWidth = gridWidth / colNum;

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
  taskStore.buildGraphData();
  updateArrows();
  document.addEventListener('mousemove', handleMouseMove);

  // 初期描画のために複数回更新をトリガー
  nextTick(() => {
    triggerCurveUpdate();
    setTimeout(() => {
      triggerCurveUpdate();
    }, TIMING.ANIMATION.SHORT_MS);
    setTimeout(() => {
      triggerCurveUpdate();
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

// ドラッグ選択のイベントハンドラ
const handleGridMouseDown = (event: MouseEvent) => {
  // タスクカード上でのクリックは無視
  if ((event.target as HTMLElement).closest('.vue-grid-item')) return;

  const rect = gridContainer.value?.getBoundingClientRect();
  if (!rect) return;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  dragStartPoint.value = { x, y };
  uiStore.startDragSelection(x, y);
  event.preventDefault();
};

const handleGridMouseMove = (event: MouseEvent) => {
  if (!uiStore.isDragSelecting || !dragStartPoint.value) return;

  const rect = gridContainer.value?.getBoundingClientRect();
  if (!rect) return;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  uiStore.updateDragSelection(x, y);

  // 選択範囲内のタスクを検出
  detectTasksInSelection();
  event.preventDefault();
};

const handleGridMouseUp = () => {
  if (uiStore.isDragSelecting) {
    uiStore.endDragSelection();
    dragStartPoint.value = null;
  }
};

const handleGridClick = (event: MouseEvent) => {
  // タスクカード以外をクリックしたら選択解除
  if (!(event.target as HTMLElement).closest('.vue-grid-item')) {
    uiStore.clearBulkSelection();
    uiStore.clearSelection();
  }
};

// 選択範囲内のタスクを検出する関数
const detectTasksInSelection = () => {
  if (!uiStore.dragSelectionRect) return;

  const rect = uiStore.dragSelectionRect;
  const selectionLeft = Math.min(rect.startX, rect.endX);
  const selectionTop = Math.min(rect.startY, rect.endY);
  const selectionRight = Math.max(rect.startX, rect.endX);
  const selectionBottom = Math.max(rect.startY, rect.endY);

  const selectedIds: string[] = [];

  layout.value.forEach((item) => {
    const taskLeft = item.x * LAYOUT.GRID.COL_WIDTH;
    const taskTop = item.y * LAYOUT.GRID.ROW_HEIGHT.NORMAL;
    const taskRight = taskLeft + item.w * LAYOUT.GRID.COL_WIDTH;
    const taskBottom = taskTop + item.h * LAYOUT.GRID.ROW_HEIGHT.NORMAL;

    // 矩形の重なり判定
    if (
      taskLeft < selectionRight &&
      taskRight > selectionLeft &&
      taskTop < selectionBottom &&
      taskBottom > selectionTop
    ) {
      selectedIds.push(item.i);
    }
  });

  uiStore.selectMultipleTasks(selectedIds);
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
