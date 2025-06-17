<template>
  <div
    class="p-3 space-y-3 text-sm max-w-xs bg-white rounded shadow-lg border border-gray-200"
  >
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-0.5">説明</label>
      <p class="text-gray-800 text-sm break-words whitespace-pre-wrap">
        {{ task.task.description || '未設定' }}
      </p>
    </div>

    <div class="flex items-center space-x-2">
      <label class="block text-xs font-medium text-gray-500">
        {{ task.task.category ? '分類:' : '難易度:' }}
      </label>
      <span
        :class="[
          'inline-block px-2 py-0.5 text-xs font-semibold rounded-full leading-none',
          difficultyBackgroundClass(task.task.difficulty),
        ]"
      >
        {{ task.task.category || `難易度: ${task.task.difficulty}` }}
        <span v-if="task.task.category" class="text-gray-600 font-normal"
          >({{ task.task.difficulty }})</span
        >
      </span>
    </div>

    <div v-if="!props.hideDependencies">
      <label class="block text-xs font-medium text-gray-500 mb-0.5">
        依存元 (Depends On):
      </label>
      <ul
        v-if="dependingOnTaskNames.length > 0"
        class="list-disc list-inside ml-3 space-y-0.5"
      >
        <li
          v-for="depName in dependingOnTaskNames"
          :key="depName"
          class="text-gray-700 text-xs"
        >
          {{ depName }}
        </li>
      </ul>
      <p v-else class="text-gray-400 italic text-xs">なし</p>
    </div>

    <div v-if="!props.hideDependencies">
      <label class="block text-xs font-medium text-gray-500 mb-0.5">
        依存先 (Depended By):
      </label>
      <ul
        v-if="dependentTaskNames.length > 0"
        class="list-disc list-inside ml-3 space-y-0.5"
      >
        <li
          v-for="depName in dependentTaskNames"
          :key="depName"
          class="text-gray-700 text-xs"
        >
          {{ depName }}
        </li>
      </ul>
      <p v-else class="text-gray-400 italic text-xs">なし</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-0.5">説明</label>
      <ul
        v-if="validNotes.length > 0"
        class="list-disc list-inside ml-3 space-y-0.5"
      >
        <li
          v-for="(note, index) in validNotes"
          :key="index"
          class="text-gray-700 text-xs break-words whitespace-pre-wrap"
        >
          {{ note }}
        </li>
      </ul>
      <p v-else class="text-gray-400 italic text-xs">なし</p>
    </div>

    <div v-if="task.task.issueNumber">
      <label class="block text-xs font-medium text-gray-500">Issue 番号:</label>
      <p class="text-gray-800 text-xs">#{{ task.task.issueNumber }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';

import type { EditorTask } from '../../model/EditorTask';
import { useCurrentTasks } from '../../store/task_store';
import { difficultyBackgroundClass } from '../../utilities/task';

const props = defineProps<{
  task: EditorTask; // EditorTask オブジェクト全体を受け取る
  hideDependencies?: boolean; // 依存関係を非表示にするオプション
}>();

const taskStore = useCurrentTasks();

// 依存関係の計算ロジックは taskStore から利用
const dependentTaskNames = computed(() => {
  if (!props.task?.task.name) return [];
  return taskStore.getDependentTasks(props.task.task.name).map((t) => t.name);
});

const dependingOnTaskNames = computed(() => {
  if (!props.task?.task.depends) return [];
  return props.task.task.depends.filter((dep) => dep && dep !== '');
});

const validNotes = computed(() => {
  if (!props.task?.task.notes) return [];
  return props.task.task.notes.filter((note) => note && note !== '');
});
</script>

<style scoped>
/* 必要に応じてスタイルを追加 */
</style>
