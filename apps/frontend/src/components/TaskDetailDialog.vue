<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';

import type { EditorTask } from '../model/EditorTask';
import { useCurrentTasks } from '../store/task_store'; // 依存タスク取得のため

const props = defineProps<{
  selectedTask: EditorTask | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const taskStore = useCurrentTasks();

// このタスクに依存している他のタスクの名前リストを取得
const dependentTaskNames = computed(() => {
  if (!props.selectedTask?.task.name) return [];
  return taskStore
    .getDependentTasks(props.selectedTask.task.name)
    .map((t) => t.name);
});

// このタスクが依存しているタスクの名前リスト (depends 配列から空文字列を除外)
const dependingOnTaskNames = computed(() => {
  if (!props.selectedTask?.task.depends) return [];
  return props.selectedTask.task.depends.filter((dep) => dep && dep !== ''); // null/undefined もチェック
});

// ノートの表示用 (空文字列やnullを除外)
const validNotes = computed(() => {
  if (!props.selectedTask?.task.notes) return [];
  return props.selectedTask.task.notes.filter((note) => note && note !== '');
});

const closeDialog = () => {
  emit('close');
};

// 背景クリックで閉じるためのハンドラ
const onClickOutside = (event: MouseEvent) => {
  // クリックされた要素がダイアログコンテンツ (.modal-content) 自身またはその子要素でない場合に閉じる
  const modalContent = (event.currentTarget as HTMLElement)?.querySelector(
    '.modal-content',
  );
  if (modalContent && !modalContent.contains(event.target as Node)) {
    closeDialog();
  }
};
</script>

<template>
  <div
    class="fixed inset-0 bg-gray-600/75 flex items-center justify-center z-50 p-4"
    @mousedown.self="onClickOutside"
  >
    <div
      v-if="selectedTask"
      class="modal-content bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'dialog-title-' + selectedTask.id"
    >
      <div
        class="flex justify-between items-center border-b p-4 sticky top-0 bg-white rounded-t-lg"
      >
        <h3
          :id="'dialog-title-' + selectedTask.id"
          class="text-lg font-semibold text-gray-800 truncate"
        >
          タスク詳細: {{ selectedTask.task.name }}
        </h3>
        <button
          @click="closeDialog"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div class="p-5 space-y-4 overflow-y-auto">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1"
            >説明:</label
          >
          <p class="text-gray-800 text-base break-words whitespace-pre-wrap">
            {{ selectedTask.task.description || '未設定' }}
          </p>
        </div>

        <div class="flex items-center space-x-4">
          <label class="block text-sm font-medium text-gray-600">難易度:</label>
          <span
            :class="[
              'inline-block px-3 py-1 text-xs font-bold rounded-full leading-none',
              taskStore.getDifficultyColor(selectedTask.task.difficulty),
            ]"
          >
            {{ selectedTask.task.difficulty }}
          </span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1"
            >このタスクの前に必要なタスク (Depends On):</label
          >
          <ul
            v-if="dependingOnTaskNames.length > 0"
            class="list-disc list-inside ml-4 space-y-1"
          >
            <li
              v-for="depName in dependingOnTaskNames"
              :key="depName"
              class="text-gray-700 text-sm"
            >
              {{ depName }}
            </li>
          </ul>
          <p v-else class="text-gray-500 italic text-sm">なし</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1"
            >このタスクの後に着手できるタスク (Depended By):</label
          >
          <ul
            v-if="dependentTaskNames.length > 0"
            class="list-disc list-inside ml-4 space-y-1"
          >
            <li
              v-for="depName in dependentTaskNames"
              :key="depName"
              class="text-gray-700 text-sm"
            >
              {{ depName }}
            </li>
          </ul>
          <p v-else class="text-gray-500 italic text-sm">なし</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1"
            >ノート:</label
          >
          <ul
            v-if="validNotes.length > 0"
            class="list-disc list-inside ml-4 space-y-1"
          >
            <li
              v-for="(note, index) in validNotes"
              :key="index"
              class="text-gray-700 text-sm break-words whitespace-pre-wrap"
            >
              {{ note }}
            </li>
          </ul>
          <p v-else class="text-gray-500 italic text-sm">なし</p>
        </div>

        <div v-if="selectedTask.task.issueNumber">
          <label class="block text-sm font-medium text-gray-600"
            >Issue 番号:</label
          >
          <p class="text-gray-800 text-sm">
            #{{ selectedTask.task.issueNumber }}
          </p>
        </div>
      </div>

      <div
        class="flex justify-end border-t p-4 sticky bottom-0 bg-gray-50 rounded-b-lg"
      >
        <button
          @click="closeDialog"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
    <div
      v-else
      class="modal-content bg-white rounded-lg shadow-xl p-6 w-full max-w-lg"
    >
      <p class="text-red-600">エラー: タスク情報が見つかりません。</p>
      <div class="mt-6 flex justify-end">
        <button
          @click="closeDialog"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* スクロールバーのスタイル（任意）*/
.modal-content ::-webkit-scrollbar {
  width: 6px;
}
.modal-content ::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.modal-content ::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.modal-content ::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
/* Firefox */
.modal-content {
  scrollbar-width: thin;
  scrollbar-color: #ccc #f1f1f1;
}
</style>
