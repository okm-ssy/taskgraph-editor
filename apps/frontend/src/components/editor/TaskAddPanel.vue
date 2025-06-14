<template>
  <div
    class="absolute top-4 right-4 z-30 bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-80"
  >
    <div class="flex justify-between items-center mb-4">
      <h4 class="font-semibold">新規タスク追加</h4>
      <button @click="handleCancel" class="text-gray-500 hover:text-gray-700">
        ×
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label
          for="task-name"
          class="block text-sm font-medium text-gray-700 mb-1"
          >タスク名</label
        >
        <input
          id="task-name"
          v-model="nameInput"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label
          for="task-description"
          class="block text-sm font-medium text-gray-700 mb-1"
          >説明</label
        >
        <textarea
          id="task-description"
          v-model="descriptionInput"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          rows="2"
        />
      </div>

      <div>
        <label
          for="task-category"
          class="block text-sm font-medium text-gray-700 mb-1"
          >タスク分類</label
        >
        <select
          id="task-category"
          v-model="categoryInput"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          @change="handleCategoryChange"
        >
          <option value="">分類を選択してください</option>
          <option
            v-for="category in allCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="task-difficulty"
          class="block text-sm font-medium text-gray-700 mb-1"
          >難易度 (1-5)</label
        >
        <input
          id="task-difficulty"
          v-model="difficultyInput"
          type="number"
          min="1"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          :class="{ 'bg-yellow-50': isAutoDifficulty }"
        />
        <p v-if="isAutoDifficulty" class="text-xs text-yellow-600 mt-1">
          分類から自動設定されました
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >依存タスク</label
        >
        <div class="text-xs text-gray-500 p-2 bg-gray-50 rounded-md">
          タスク作成後、タスクカードの青い丸をドラッグ&ドロップして依存関係を設定してください
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button
          type="button"
          @click="handleCancel"
          class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors"
        >
          キャンセル
        </button>
        <button
          type="button"
          @click="addNewTask"
          class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
        >
          追加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useTaskCategories } from '../../composables/useTaskCategories';
import { useCurrentTasks } from '../../store/task_store';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const taskStore = useCurrentTasks();
const { getDifficultyByCategory, allCategories } = useTaskCategories();

const nameInput = ref('new-task');
const descriptionInput = ref('タスクの説明');
const categoryInput = ref('');
const difficultyInput = ref(1);
const isAutoDifficulty = ref(false);

// 分類選択時の処理
const handleCategoryChange = () => {
  const autoDifficulty = getDifficultyByCategory(categoryInput.value);
  if (autoDifficulty !== null) {
    difficultyInput.value = autoDifficulty;
    isAutoDifficulty.value = true;
  } else {
    isAutoDifficulty.value = false;
  }
};

// 新規タスク追加
const addNewTask = () => {
  const newTask = taskStore.addTask();

  // タスク情報の更新（依存関係は空配列）
  taskStore.updateTask(newTask.id, {
    name: nameInput.value,
    description: descriptionInput.value,
    difficulty: parseFloat(difficultyInput.value.toString()),
    category: categoryInput.value,
    depends: [''],
  });

  // 入力フィールドをリセット
  nameInput.value = 'new-task';
  descriptionInput.value = 'タスクの説明';
  categoryInput.value = '';
  difficultyInput.value = 1;
  isAutoDifficulty.value = false;

  // パネルを閉じる
  emit('close');
};

// キャンセル処理
const handleCancel = () => {
  emit('close');
};
</script>

<style scoped></style>
