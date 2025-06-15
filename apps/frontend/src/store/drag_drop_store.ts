import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useDragDropStore = defineStore('dragDrop', () => {
  // ドラッグ中のソースタスクID
  const draggingSourceId = ref<string | null>(null);

  // ドロップ可能なターゲットタスクID
  const droppableTargetId = ref<string | null>(null);

  // ドラッグ中のマウス位置
  const dragPosition = ref<{ x: number; y: number } | null>(null);

  // ドラッグ中かどうか
  const isDragging = computed(() => draggingSourceId.value !== null);

  // ドラッグ開始
  const startDrag = (sourceId: string) => {
    draggingSourceId.value = sourceId;
  };

  // ドラッグ終了
  const endDrag = () => {
    draggingSourceId.value = null;
    droppableTargetId.value = null;
    dragPosition.value = null;
  };

  // マウス位置の更新
  const updateDragPosition = (x: number, y: number) => {
    dragPosition.value = { x, y };
  };

  // ドロップ可能なターゲットにホバー
  const setDroppableTarget = (targetId: string | null) => {
    droppableTargetId.value = targetId;
  };

  // ドロップ可能かチェック（自分自身へのドロップは不可）
  const canDrop = (targetId: string) => {
    return isDragging.value && draggingSourceId.value !== targetId;
  };

  return {
    // State
    draggingSourceId,
    droppableTargetId,
    dragPosition,
    isDragging,

    // Actions
    startDrag,
    endDrag,
    updateDragPosition,
    setDroppableTarget,
    canDrop,
  };
});
