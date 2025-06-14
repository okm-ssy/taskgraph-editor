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
            for="category"
            class="block text-sm font-medium text-gray-700 mb-1"
            >カテゴリ</label
          >
          <select
            id="category"
            v-model="categoryInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            @change="onCategoryChange"
          >
            <option value="">カテゴリを選択してください</option>
            <option
              v-for="category in allCategories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
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
          <p v-if="categoryInput" class="text-xs text-gray-500 mt-1">
            カテゴリ「{{ categoryInput }}」の推奨難易度:
            {{ getDifficultyByCategory(categoryInput) }}
          </p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >依存タスク</label
          >
          <div class="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
            <p
              v-if="
                taskStore.selectedTask &&
                taskStore.selectedTask.task.depends.length > 0 &&
                taskStore.selectedTask.task.depends[0] !== ''
              "
            >
              {{ taskStore.selectedTask.task.depends.join(', ') }}
            </p>
            <p v-else class="text-gray-400">依存関係はありません</p>
            <p class="mt-2 text-xs text-gray-500">
              ※
              依存関係の追加・削除は、タスクカードの青い丸をドラッグ&ドロップするか、矢印をクリックして行ってください
            </p>
          </div>
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

<script setup lang="ts">
import { ref, watch } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const { allCategories, getDifficultyByCategory } = useTaskCategories();

const nameInput = ref('');
const descriptionInput = ref('');
const difficultyInput = ref(1);
const categoryInput = ref('');

// 選択中のタスクが変更されたら入力フィールドを更新
watch(
  () => taskStore.selectedTask,
  (newTask) => {
    if (newTask) {
      nameInput.value = newTask.task.name;
      descriptionInput.value = newTask.task.description;
      difficultyInput.value = newTask.task.difficulty;
      categoryInput.value = newTask.task.category || '';
    }
  },
  { immediate: true },
);

// カテゴリが変更された時の処理
const onCategoryChange = () => {
  if (categoryInput.value) {
    const suggestedDifficulty = getDifficultyByCategory(categoryInput.value);
    if (suggestedDifficulty !== null) {
      difficultyInput.value = suggestedDifficulty;
    }
  }
};

// フォーム送信時の処理
const handleSubmit = () => {
  if (!taskStore.selectedTask) return;

  // タスク更新（依存関係は変更しない）
  taskStore.updateTask(taskStore.selectedTask.id, {
    name: nameInput.value,
    description: descriptionInput.value,
    difficulty: difficultyInput.value,
    category: categoryInput.value,
  });

  // ダイアログを閉じる
  uiStore.closeDetailDialog();
};

const handleCancel = () => {
  uiStore.closeDetailDialog();
};
</script>

<style scoped></style>
