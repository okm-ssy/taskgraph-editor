<script setup lang="ts">
import { computed } from 'vue';

import type { Task } from '../../model/Taskgraph';
import { useCurrentTasks } from '../../store/task_store';

const props = defineProps<{
  task: Task;
  id: string;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

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
    taskStore.removeTask(props.id);
  }
};

// カード本体クリック時の処理
const handleCardClick = () => {
  emit('click');
};
</script>

<template>
  <div
    class="h-full w-full flex flex-col border-2 rounded-lg transition-colors overflow-hidden"
    :class="difficultyColorClass"
  >
    <!-- target: カード上部中央 -->
    <div
      :id="`target-${id}`"
      class="absolute left-1/2 top-0 -translate-x-1/2 w-2 h-2 z-20"
    />
    <!-- ドラッグハンドル部分 (カードの上部) -->
    <div
      class="drag-handle py-2 px-3 flex justify-between items-center border-b border-opacity-30 cursor-move relative"
      :class="difficultyColorClass.replace('bg-', 'bg-opacity-70 bg-')"
    >
      <div class="flex items-center justify-start overflow-x-hidden">
        <div
          class="border-2 border-white bg-blue-500 rounded-full h-2 w-2 mr-2"
        />
        <div class="font-bold text-gray-800 truncate text-sm">
          {{ task.name }}
        </div>
      </div>
      <div>
        <button
          @click="handleRemove"
          class="text-gray-500 hover:text-red-500 transition-colors text-sm"
        >
          ×
        </button>
      </div>
    </div>

    <!-- カード本体 (クリックで詳細表示) -->
    <div
      class="task-content p-3 flex-1 flex flex-col cursor-pointer relative"
      @click="handleCardClick"
      @dragenter.prevent
      @dragover.prevent
    >
      <p class="text-sm text-gray-700 line-clamp-2 mb-2">
        {{ task.description }}
      </p>

      <div class="mt-auto flex justify-between items-center">
        <span class="text-xs bg-white rounded-full px-2 py-1 text-gray-700">
          難易度: {{ task.difficulty }}
        </span>
        <span class="text-xs text-gray-600">
          <template v-if="task.depends.length > 0 && task.depends[0] !== ''">
            <span>依存: {{ task.depends.join(', ') }}</span>
          </template>
        </span>
      </div>
      <!-- source: カード下部中央 -->
      <div
        :id="`source-${id}`"
        class="absolute left-1/2 bottom-0 -translate-x-1/2 w-2 h-2 z-20"
      />
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drag-handle {
  cursor: move; /* ドラッグハンドルのカーソルを変更 */
}
</style>
