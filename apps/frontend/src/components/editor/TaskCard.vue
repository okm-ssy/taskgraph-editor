<template>
  <div
    class="h-full w-full flex flex-col border-2 rounded-lg transition-all relative"
    style="z-index: 1; overflow: visible"
    :class="[
      difficultyColorClass,
      isDroppable ? 'ring-4 ring-blue-400 scale-105' : '',
      isDraggingSource ? 'opacity-50' : '',
    ]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- target: 依存先（矢印の終点） -->
    <div
      :id="`target-${id}`"
      class="absolute -left-1 top-6 -translate-x-1/4 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4"
      style="z-index: 6"
    />

    <!-- source: 依存元（矢印の起点、ドラッグ可能） -->
    <div
      :id="`source-${id}`"
      class="dependency-handle absolute right-0 top-6 translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4 cursor-move hover:scale-125 transition-transform"
      style="z-index: 6"
      draggable="true"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      title="ドラッグして依存関係を作成"
    />

    <!-- ドラッグハンドル部分 (カードの上部) -->
    <div
      class="drag-handle py-2 px-3 flex justify-between items-center border-b border-opacity-30 cursor-move relative"
      :class="difficultyColorClass.replace('bg-', 'bg-opacity-70 bg-')"
    >
      <div class="flex items-center justify-start overflow-x-hidden">
        <div class="font-bold text-gray-800 truncate text-sm">
          {{ task.name }}
        </div>
      </div>
      <div class="flex items-center justify-center">
        <button
          @click="handleRemove"
          class="task-action-button text-gray-500 hover:bg-white rounded-full p-1"
        >
          ×
        </button>
      </div>
    </div>

    <!-- カード本体 (クリックで詳細表示) -->
    <div
      class="task-content p-3 flex-1 flex flex-col cursor-pointer relative overflow-hidden"
      @click="handleCardClick"
      @dragenter.prevent
      @dragover.prevent
    >
      <p class="text-sm text-gray-700 line-clamp-2 mb-2">
        {{ task.description }}
      </p>

      <div class="mt-auto flex justify-end">
        <span class="text-xs bg-white rounded-full px-2 py-1 text-gray-700">
          難易度: {{ task.difficulty }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTaskActions } from '../../composables/useTaskActions';
import type { Task } from '../../model/Taskgraph';
import { useDragDropStore } from '../../store/drag_drop_store';
import { useCurrentTasks } from '../../store/task_store';

const props = defineProps<{
  task: Task;
  id: string;
}>();

const taskActions = useTaskActions();
const dragDropStore = useDragDropStore();
const taskStore = useCurrentTasks();

// 難易度に基づいて背景色を計算
const difficultyColorClass = computed(() => {
  const difficulty = Math.min(
    Math.max(Math.floor(props.task.difficulty), 1),
    5,
  );

  const colors = [
    'bg-green-100 border-green-300', // 1
    'bg-yellow-100 border-yellow-300', // 2
    'bg-orange-100 border-orange-300', // 3
    'bg-red-100 border-red-300', // 4
    'bg-purple-100 border-purple-300', // 5
  ];

  return colors[difficulty - 1];
});

// タスク削除ハンドラ
const handleRemove = (event: Event) => {
  event.stopPropagation();
  if (confirm(`タスク「${props.task.name}」を削除してもよろしいですか？`)) {
    taskActions.deleteTask(props.id);
  }
};

// カード本体クリック時の処理
const handleCardClick = () => {
  taskActions.selectTask(props.id);
};

// ドラッグ開始（source から）
const handleDragStart = (event: DragEvent) => {
  event.stopPropagation(); // 親要素へのイベント伝播を防ぐ
  event.dataTransfer!.effectAllowed = 'link';
  event.dataTransfer!.setData('text/plain', props.id);

  // ドラッグ画像を透明にする
  const dragImage = new Image();
  dragImage.src =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
  event.dataTransfer!.setDragImage(dragImage, 0, 0);

  dragDropStore.startDrag(props.id);
};

// ドラッグ終了
const handleDragEnd = () => {
  dragDropStore.endDrag();
};

// ドラッグオーバー（target へ）
const handleDragOver = (event: DragEvent) => {
  if (dragDropStore.canDrop(props.id)) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'link';
    dragDropStore.setDroppableTarget(props.id);
  }
};

// ドラッグ離脱
const handleDragLeave = () => {
  if (dragDropStore.droppableTargetId === props.id) {
    dragDropStore.setDroppableTarget(null);
  }
};

// ドロップ（依存関係を作成）
const handleDrop = (event: DragEvent) => {
  event.preventDefault();

  if (dragDropStore.canDrop(props.id) && dragDropStore.draggingSourceId) {
    // ドラッグ元のタスクを取得
    const sourceTask = taskStore.getTaskById(dragDropStore.draggingSourceId);
    const targetTask = taskStore.getTaskById(props.id);

    if (sourceTask && targetTask) {
      // ドロップ先（target）がドラッグ元（source）に依存する
      // つまり、source → target の矢印を引く
      const newDepends = [...targetTask.task.depends];
      if (!newDepends.includes(sourceTask.task.name)) {
        newDepends.push(sourceTask.task.name);
        taskStore.updateTask(props.id, {
          depends: newDepends.filter((d) => d !== ''),
        });
      }
    }
  }
  dragDropStore.endDrag();
};

// ドロップ可能な状態かどうか
const isDroppable = computed(() => {
  return (
    dragDropStore.isDragging &&
    dragDropStore.droppableTargetId === props.id &&
    dragDropStore.canDrop(props.id)
  );
});

// ドラッグ中のソースかどうか
const isDraggingSource = computed(() => {
  return dragDropStore.draggingSourceId === props.id;
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ドラッグ中のパフォーマンス最適化 */
.task-card {
  will-change: auto;
  contain: layout style paint;
}

/* ドラッグハンドルの最適化 */
.drag-handle {
  touch-action: none;
  user-select: none;
}

/* 依存関係ハンドルの最適化 */
.dependency-handle {
  will-change: transform;
  contain: layout;
}
</style>
