import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEditorUIStore = defineStore('editorUI', () => {
  // 選択されたタスクのID
  const selectedTaskId = ref<string | null>(null);
  
  // タスク詳細ダイアログの表示状態
  const isDetailDialogVisible = ref(false);
  
  // タスク追加パネルの表示状態
  const showAddPanel = ref(false);
  
  // エディターグリッドでの選択状態
  const isSelecting = ref(false);
  
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
  
  // タスク追加パネルの表示を切り替え
  const toggleAddPanel = () => {
    showAddPanel.value = !showAddPanel.value;
  };
  
  return {
    // State
    selectedTaskId,
    isDetailDialogVisible,
    showAddPanel,
    isSelecting,
    
    // Actions
    selectTask,
    clearSelection,
    openDetailDialog,
    closeDetailDialog,
    toggleAddPanel,
  };
});