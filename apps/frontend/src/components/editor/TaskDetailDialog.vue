<script setup lang="ts">
import { ref, watch } from 'vue';

import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const nameInput = ref('');
const descriptionInput = ref('');
const difficultyInput = ref(1);
const dependsInput = ref('');

// 選択中のタスクが変更されたら入力フィールドを更新
watch(
  () => taskStore.selectedTask,
  (newTask) => {
    if (newTask) {
      nameInput.value = newTask.task.name;
      descriptionInput.value = newTask.task.description;
      difficultyInput.value = newTask.task.difficulty;
      dependsInput.value = newTask.task.depends
        .filter((d) => d !== '')
        .join(', ');
    }
  },
  { immediate: true },
);

// フォーム送信時の処理
const handleSubmit = () => {
  if (!taskStore.selectedTask) return;

  // 依存関係を配列に変換
  const dependsArray = dependsInput.value
    ? dependsInput.value
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d !== '')
    : [''];

  // タスク更新
  taskStore.updateTask(taskStore.selectedTask.id, {
    name: nameInput.value,
    description: descriptionInput.value,
    difficulty: difficultyInput.value,
    depends: dependsArray,
  });

  // ダイアログを閉じる
  uiStore.closeDetailDialog();
};

const handleCancel = () => {
  uiStore.closeDetailDialog();
};
</script>

<template>
  <div
    v-if="uiStore.isDetailDialogVisible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="handleCancel"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="border-b px-6 py-4">
        <h3 class="text-lg font-medium">タスク詳細</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1"
            >タスク名</label
          >
          <input
            id="name"
            v-model="nameInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div class="mb-4">
          <label
            for="description"
            class="block text-sm font-medium text-gray-700 mb-1"
            >説明</label
          >
          <textarea
            id="description"
            v-model="descriptionInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="3"
          />
        </div>

        <div class="mb-4">
          <label
            for="difficulty"
            class="block text-sm font-medium text-gray-700 mb-1"
            >難易度 (1-5)</label
          >
          <input
            id="difficulty"
            v-model="difficultyInput"
            type="number"
            min="1"
            max="5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div class="mb-4">
          <label
            for="depends"
            class="block text-sm font-medium text-gray-700 mb-1"
            >依存タスク (カンマ区切り)</label
          >
          <input
            id="depends"
            v-model="dependsInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="task-1, task-2"
          />
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped></style>
