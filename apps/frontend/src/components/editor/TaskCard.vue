<template>
  <div
    :class="[
      'h-full w-full flex flex-col border-2 rounded-lg transition-all relative',
      fieldColorClass,
      isDroppable ? 'ring-4 ring-blue-400 scale-105' : '',
      isDraggingSource ? 'opacity-50' : '',
      'compact-mode',
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : '',
    ]"
    style="z-index: 1; overflow: visible"
    @dragover="!props.readOnly && handleDragOver($event)"
    @dragleave="!props.readOnly && handleDragLeave()"
    @drop="!props.readOnly && handleDrop($event)"
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
      class="dependency-handle absolute right-0 top-6 translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4 transition-transform"
      :class="props.readOnly ? 'cursor-default' : 'cursor-move hover:scale-125'"
      style="z-index: 20"
      :draggable="!props.readOnly"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      :title="props.readOnly ? '依存関係表示' : 'ドラッグして依存関係を作成'"
    />

    <!-- ドラッグハンドル部分 (カードの上部) -->
    <div
      :class="[
        'drag-handle py-1 px-3 flex justify-between items-center border-b border-opacity-30 relative',
        !props.readOnly ? 'cursor-move' : '',
        fieldColorClass.replace('bg-', 'bg-opacity-70 bg-'),
      ]"
    >
      <div class="flex items-center justify-start overflow-x-hidden">
        <div
          :class="[
            'font-bold truncate text-sm',
            task.addition?.status === 'done'
              ? 'text-gray-400'
              : 'text-gray-800',
          ]"
        >
          {{ task.name }}
        </div>
      </div>
      <div class="flex items-center justify-center min-w-[2rem] h-8">
        <button
          v-if="!props.readOnly"
          @click="handleRemove"
          class="task-action-button text-gray-500 hover:bg-white rounded-full p-1"
        >
          ×
        </button>
      </div>
    </div>

    <VDropdown
      :lazy="true"
      v-bind="dropdownOptions"
      :aria-id="`tooltip-for-${id}`"
      class="h-full w-full"
    >
      <!-- カード本体 (クリックで詳細表示) -->

      <div
        :class="[
          'task-content flex-1 flex flex-col cursor-pointer relative overflow-hidden',
          'p-2',
        ]"
        @click="handleCardClick"
        @dragenter.prevent
        @dragover.prevent
      >
        <p :class="['text-gray-700 line-clamp-1 mb-2', 'text-xs']">
          {{ task.description }}
        </p>

        <div class="mt-auto flex justify-between items-center">
          <!-- 左側: Issue リンクと情報シグナル -->
          <div class="flex items-center gap-2">
            <!-- GitHub Issue リンク -->
            <a
              v-if="hasGitHubInfo"
              :href="issueUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
              :class="[
                'text-blue-600 hover:text-blue-800 font-medium underline',
                'text-[10px]',
              ]"
            >
              #{{ task.issueNumber }}
            </a>

            <!-- 追加情報シグナル -->
            <TaskInfoSignal :task="task" :compact="true" />
          </div>
          <div class="m-1" />
          <!-- カテゴリ/難易度 -->
          <span :class="['bg-white rounded-full px-2 py-1', 'text-[10px]']">
            <span
              v-if="task.addition?.category"
              :class="difficultyTextColorClass"
            >
              {{ task.addition.category }}
              <span class="ml-1">({{ task.difficulty }})</span>
            </span>
            <span v-else :class="difficultyTextColorClass">
              難易度: {{ task.difficulty }}
            </span>
          </span>
        </div>
      </div>
      <template #popper>
        <TaskDetailTooltip
          v-if="getEditorTaskById(id)"
          :task="getEditorTaskById(id)!"
          :hide-dependencies="true"
        />
        <div v-else class="p-2 bg-red-100 text-red-700 text-xs">
          詳細情報取得エラー
        </div>
      </template>
    </VDropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { TIMING } from '../../constants';
import type { Task } from '../../model/Taskgraph';
import { useDragDropStore } from '../../store/drag_drop_store';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import {
  fieldBackgroundClass,
  difficultyColorClass,
} from '../../utilities/task';
import TaskInfoSignal from '../TaskInfoSignal.vue';

import TaskDetailTooltip from './TaskDetailTooltip.vue';

import type { TaskStatus } from '@/constants';

const props = defineProps<{
  task: Task;
  id: string;
  readOnly?: boolean;
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
  placement: 'bottom',
};

// EditorTaskを取得する関数
const getEditorTaskById = (id: string) => {
  return taskStore.getTaskById(id);
};

// 分野と進捗状況に基づいて背景色を計算
const fieldColorClass = computed(() => {
  const status = props.task.addition?.status as TaskStatus;
  return fieldBackgroundClass(props.task.addition?.field || '', status);
});

// 難易度に基づいて文字色を計算
const difficultyTextColorClass = computed(() => {
  return difficultyColorClass(props.task.difficulty);
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
  if (props.readOnly) {
    event.preventDefault();
    return;
  }

  console.log('🚀 handleDragStart called:', {
    sourceId: props.id,
    taskName: props.task.name,
  });
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
  if (props.readOnly) {
    return;
  }
  console.log('🏁 handleDragEnd called');
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

  console.log('🎯 handleDrop called:', {
    targetId: props.id,
    draggingSourceId: dragDropStore.draggingSourceId,
    canDrop: dragDropStore.canDrop(props.id),
    readOnly: props.readOnly,
  });

  if (dragDropStore.canDrop(props.id) && dragDropStore.draggingSourceId) {
    // ドラッグ元のタスクを取得
    const sourceTask = taskStore.getTaskById(dragDropStore.draggingSourceId);
    const targetTask = taskStore.getTaskById(props.id);

    console.log('📋 Task details:', {
      sourceTask: sourceTask
        ? { id: sourceTask.id, name: sourceTask.task.name }
        : null,
      targetTask: targetTask
        ? {
            id: targetTask.id,
            name: targetTask.task.name,
            currentDepends: targetTask.task.depends,
          }
        : null,
    });

    if (sourceTask && targetTask) {
      // ドロップ先（target）がドラッグ元（source）に依存する
      // つまり、source → target の矢印を引く
      const newDepends = [...targetTask.task.depends];
      if (!newDepends.includes(sourceTask.task.name)) {
        newDepends.push(sourceTask.task.name);
        console.log('✅ Adding dependency:', {
          target: targetTask.task.name,
          source: sourceTask.task.name,
          newDepends,
        });
        const updateResult = taskStore.updateTask(props.id, {
          depends: newDepends,
        });
        console.log('📝 Update result:', updateResult);
      } else {
        console.log('⚠️ Dependency already exists');
      }
    } else {
      console.log('❌ Missing tasks:', {
        sourceTask: !!sourceTask,
        targetTask: !!targetTask,
      });
    }
  } else {
    console.log('❌ Cannot drop:', {
      canDrop: dragDropStore.canDrop(props.id),
      draggingSourceId: dragDropStore.draggingSourceId,
    });
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
