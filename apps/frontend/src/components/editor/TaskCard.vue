<template>
  <VDropdown
    :lazy="true"
    v-bind="dropdownOptions"
    :aria-id="`tooltip-for-${id}`"
    class="h-full w-full"
  >
    <div
      :class="[
        'h-full w-full flex flex-col border-2 rounded-lg transition-all relative',
        difficultyColorClass,
        isDroppable ? 'ring-4 ring-blue-400 scale-105' : '',
        isDraggingSource ? 'opacity-50' : '',
        props.compact ? 'compact-mode' : 'normal-mode',
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : '',
      ]"
      style="z-index: 1; overflow: visible"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      :aria-describedby="`tooltip-for-${id}`"
    >
      <!-- target: 依存先（矢印の終点） -->
      <div
        :id="`target-${id}`"
        class="absolute -left-1 top-6 -translate-x-1/4 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4"
        style="z-index: 20"
      />

      <!-- source: 依存元（矢印の起点、ドラッグ可能） -->
      <div
        :id="`source-${id}`"
        class="dependency-handle absolute right-0 top-6 translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4 cursor-move hover:scale-125 transition-transform"
        style="z-index: 20"
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
        :class="[
          'task-content flex-1 flex flex-col cursor-pointer relative overflow-hidden',
          props.compact ? 'p-2' : 'p-3',
        ]"
        @click="handleCardClick"
        @dragenter.prevent
        @dragover.prevent
      >
        <p
          :class="[
            'text-gray-700 line-clamp-2 mb-2',
            props.compact ? 'text-xs' : 'text-sm',
          ]"
        >
          {{ task.description }}
        </p>

        <div class="mt-auto flex justify-between items-center">
          <!-- GitHub Issue リンク -->
          <a
            v-if="hasGitHubInfo"
            :href="issueUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
            :class="[
              'text-blue-600 hover:text-blue-800 font-medium underline',
              props.compact ? 'text-[10px]' : 'text-xs',
            ]"
          >
            #{{ task.issueNumber }}
          </a>
          <div v-else />

          <!-- カテゴリ/難易度 -->
          <span
            :class="[
              'bg-white rounded-full px-2 py-1 text-gray-700',
              props.compact ? 'text-[10px]' : 'text-xs',
            ]"
          >
            {{ task.addition?.category || `難易度: ${task.difficulty}` }}
            <span v-if="task.addition?.category" class="text-gray-500"
              >({{ task.difficulty }})</span
            >
          </span>
        </div>
      </div>
    </div>

    <template #popper>
      <TaskDetail
        v-if="getEditorTaskById(id)"
        :task="getEditorTaskById(id)!"
        :hide-dependencies="true"
      />
      <div v-else class="p-2 bg-red-100 text-red-700 text-xs">
        詳細情報取得エラー
      </div>
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { TIMING } from '../../constants';
import type { Task } from '../../model/Taskgraph';
import { useDragDropStore } from '../../store/drag_drop_store';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import { difficultyBackgroundClass } from '../../utilities/task';
import TaskDetail from '../viewer/TaskDetail.vue';

const props = defineProps<{
  task: Task;
  id: string;
  compact?: boolean;
}>();

const dragDropStore = useDragDropStore();
const uiStore = useEditorUIStore();
const taskStore = useCurrentTasks();

// ドロップダウンオプション
const dropdownOptions = {
  triggers: ['hover', 'focus'],
  delay: {
    show: TIMING.TOOLTIP.SHOW_DELAY_MS,
    hide: TIMING.TOOLTIP.HIDE_DELAY_MS,
  },
  placement: 'auto',
};

// EditorTaskを取得する関数
const getEditorTaskById = (id: string) => {
  return taskStore.getTaskById(id);
};

// 難易度に基づいて背景色を計算
const difficultyColorClass = computed(() => {
  return difficultyBackgroundClass(props.task.difficulty);
});

// タスク削除ハンドラ
const handleRemove = (event: Event) => {
  event.stopPropagation();
  if (confirm(`タスク「${props.task.name}」を削除してもよろしいですか？`)) {
    taskStore.removeTask(props.id);
  }
};

// カード本体クリック時の処理
const handleCardClick = () => {
  taskStore.selectTask(props.id);
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
          depends: newDepends,
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

// 選択状態の判定
const isSelected = computed(() => {
  return uiStore.selectedTaskIds.has(props.id);
});

// GitHub Issue関連のcomputed properties
const hasGitHubInfo = computed(() => {
  return (
    taskStore.info?.github?.organization &&
    taskStore.info?.github?.repository &&
    props.task.issueNumber
  );
});

const issueUrl = computed(() => {
  if (!hasGitHubInfo.value) return '';
  const { organization, repository } = taskStore.info.github!;
  return `https://github.com/${organization}/${repository}/issues/${props.task.issueNumber}`;
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

/* ビューアと同じtooltipスタイル */
:deep(.v-popper__inner) {
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}
:deep(.v-popper__arrow-container) {
  display: none;
}
</style>
