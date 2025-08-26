import { defineStore } from 'pinia';
import { ref } from 'vue';

interface SelectionRectangle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const useEditorUIStore = defineStore('editorUI', () => {
  // 選択されたタスクのID
  const selectedTaskId = ref<string | null>(null);

  // タスク詳細ダイアログの表示状態
  const isDetailDialogVisible = ref(false);

  // プロジェクト情報ダイアログの表示状態
  const isInfoDialogVisible = ref(false);

  // タスク追加パネルの表示状態
  const showAddPanel = ref(false);

  // エディターグリッドでの選択状態
  const isSelecting = ref(false);

  // ドラッグ選択関連の状態
  const isDragSelecting = ref(false);
  const dragSelectionRect = ref<SelectionRectangle | null>(null);
  const selectedTaskIds = ref<Set<string>>(new Set());
  const isBulkMoving = ref(false);

  // タスクを選択
  const selectTask = (taskId: string | null) => {
    selectedTaskId.value = taskId;
    if (taskId) {
      isSelecting.value = true;
    }
  };

  // タスクの選択を解除
  const clearSelection = () => {
    selectedTaskId.value = null;
    isSelecting.value = false;
  };

  // タスク詳細ダイアログを開く
  const openDetailDialog = () => {
    isDetailDialogVisible.value = true;
  };

  // タスク詳細ダイアログを閉じる
  const closeDetailDialog = () => {
    isDetailDialogVisible.value = false;
  };

  // プロジェクト情報ダイアログを開く
  const openInfoDialog = () => {
    isInfoDialogVisible.value = true;
  };

  // プロジェクト情報ダイアログを閉じる
  const closeInfoDialog = () => {
    isInfoDialogVisible.value = false;
  };

  // タスク追加パネルの表示を切り替え
  const toggleAddPanel = () => {
    showAddPanel.value = !showAddPanel.value;
  };

  // ドラッグ選択開始
  const startDragSelection = (startX: number, startY: number) => {
    isDragSelecting.value = true;
    dragSelectionRect.value = { startX, startY, endX: startX, endY: startY };
  };

  // ドラッグ選択更新
  const updateDragSelection = (endX: number, endY: number) => {
    if (dragSelectionRect.value) {
      dragSelectionRect.value.endX = endX;
      dragSelectionRect.value.endY = endY;
    }
  };

  // ドラッグ選択終了
  const endDragSelection = () => {
    isDragSelecting.value = false;
    dragSelectionRect.value = null;
  };

  // 複数タスク選択
  const selectMultipleTasks = (taskIds: string[]) => {
    selectedTaskIds.value = new Set(taskIds);
  };

  // 選択範囲のクリア
  const clearBulkSelection = () => {
    selectedTaskIds.value.clear();
    isBulkMoving.value = false;
  };

  // バルク移動開始
  const startBulkMoving = () => {
    isBulkMoving.value = true;
  };

  // バルク移動終了
  const endBulkMoving = () => {
    isBulkMoving.value = false;
  };

  // 循環依存警告
  const circularWarning = ref<string[]>([]);
  const showCircularWarning = ref(false);

  // 循環依存警告を表示
  const setCircularWarning = (taskNames: string[]) => {
    circularWarning.value = taskNames;
    showCircularWarning.value = taskNames.length > 0;
    if (taskNames.length > 0) {
      // 5秒後に自動的に警告を隠す
      setTimeout(() => {
        showCircularWarning.value = false;
      }, 5000);
    }
  };

  // 循環依存警告をクリア
  const clearCircularWarning = () => {
    circularWarning.value = [];
    showCircularWarning.value = false;
  };

  return {
    // State
    selectedTaskId,
    isDetailDialogVisible,
    isInfoDialogVisible,
    showAddPanel,
    isSelecting,
    isDragSelecting,
    dragSelectionRect,
    selectedTaskIds,
    isBulkMoving,
    circularWarning,
    showCircularWarning,

    // Actions
    selectTask,
    clearSelection,
    openDetailDialog,
    closeDetailDialog,
    openInfoDialog,
    closeInfoDialog,
    toggleAddPanel,
    startDragSelection,
    updateDragSelection,
    endDragSelection,
    selectMultipleTasks,
    clearBulkSelection,
    startBulkMoving,
    endBulkMoving,
    setCircularWarning,
    clearCircularWarning,
  };
});
