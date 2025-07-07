<template>
  <div
    class="p-4 space-y-4 text-sm max-w-md bg-white rounded-lg shadow-xl border border-gray-300"
  >
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-0.5"
        >タスク名</label
      >
      <p class="text-gray-800 text-sm font-semibold break-words">
        {{ task.task.name }}
      </p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-0.5">説明</label>
      <p class="text-gray-800 text-sm break-words whitespace-pre-wrap">
        {{ task.task.description || '未設定' }}
      </p>
    </div>

    <div class="flex items-center space-x-2">
      <label class="block text-xs font-medium text-gray-500">
        {{ task.task.addition?.category ? '分類:' : '難易度:' }}
      </label>
      <span
        :class="[
          'inline-block px-2 py-0.5 text-xs font-semibold rounded-full leading-none',
          difficultyBackgroundClass(task.task.difficulty),
        ]"
      >
        {{ task.task.addition?.category || `難易度: ${task.task.difficulty}` }}
        <span
          v-if="task.task.addition?.category"
          class="text-gray-600 font-normal"
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

    <!-- 実装支援情報セクション -->
    <div v-if="hasImplementationInfo" class="border-t pt-3">
      <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <span class="text-blue-600 mr-1">🛠️</span>
        実装支援情報
      </h4>

      <!-- 受け入れ基準 (最重要・最初に表示) -->
      <div
        v-if="validAcceptanceCriteria.length > 0"
        class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
      >
        <label
          class="block text-sm font-bold text-blue-800 mb-2 flex items-center"
        >
          <span class="mr-1">✅</span>
          受け入れ基準
        </label>
        <ul class="space-y-1">
          <li
            v-for="(criteria, index) in validAcceptanceCriteria"
            :key="index"
            class="text-blue-800 text-sm break-words flex items-start"
          >
            <span class="text-blue-600 mr-2 mt-0.5">•</span>
            <span>{{ criteria }}</span>
          </li>
        </ul>
      </div>

      <!-- UI要件 -->
      <div
        v-if="task.task.addition?.ui_requirements"
        class="mb-3 p-3 bg-green-50 rounded-lg border border-green-200"
      >
        <label
          class="block text-sm font-bold text-green-800 mb-2 flex items-center"
        >
          <span class="mr-1">🎨</span>
          UI・画面要件
        </label>
        <p class="text-green-800 text-sm break-words whitespace-pre-wrap">
          {{ task.task.addition.ui_requirements }}
        </p>
      </div>

      <!-- データ要件 -->
      <div
        v-if="task.task.addition?.data_requirements"
        class="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
      >
        <label
          class="block text-sm font-bold text-purple-800 mb-2 flex items-center"
        >
          <span class="mr-1">💾</span>
          データ・API要件
        </label>
        <p class="text-purple-800 text-sm break-words whitespace-pre-wrap">
          {{ task.task.addition.data_requirements }}
        </p>
      </div>

      <!-- 実装メモ -->
      <div
        v-if="validImplementationNotes.length > 0"
        class="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
      >
        <label
          class="block text-sm font-bold text-orange-800 mb-2 flex items-center"
        >
          <span class="mr-1">📝</span>
          実装時の注意点
        </label>
        <ul class="space-y-1">
          <li
            v-for="(note, index) in validImplementationNotes"
            :key="index"
            class="text-orange-800 text-sm break-words flex items-start"
          >
            <span class="text-orange-600 mr-2 mt-0.5">•</span>
            <span>{{ note }}</span>
          </li>
        </ul>
      </div>

      <!-- 関連画面設計 -->
      <div
        v-if="validDesignImages.length > 0"
        class="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
      >
        <label
          class="block text-sm font-bold text-indigo-800 mb-2 flex items-center"
        >
          <span class="mr-1">🖼️</span>
          関連画面設計
        </label>
        <ul class="space-y-1">
          <li
            v-for="(imageId, index) in validDesignImages"
            :key="index"
            class="text-indigo-800 text-sm break-words font-mono flex items-start"
          >
            <span class="text-indigo-600 mr-2 mt-0.5">•</span>
            <span>{{ imageId }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="validRelations.length > 0">
      <label class="block text-xs font-medium text-gray-500 mb-0.5"
        >関連ファイル</label
      >
      <ul class="list-disc list-inside ml-3 space-y-0.5">
        <li
          v-for="(relation, index) in validRelations"
          :key="index"
          class="text-gray-700 text-xs break-words font-mono"
        >
          {{ relation }}
        </li>
      </ul>
    </div>

    <div v-if="task.task.issueNumber">
      <label class="block text-xs font-medium text-gray-500">Issue 番号:</label>
      <p class="text-gray-800 text-xs">#{{ task.task.issueNumber }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const validRelations = computed(() => {
  if (!props.task?.task.addition?.relations) return [];
  return props.task.task.addition.relations.filter(
    (relation) => relation && relation !== '',
  );
});

// 実装支援情報の計算されたプロパティ
const validAcceptanceCriteria = computed(() => {
  if (!props.task?.task.addition?.acceptance_criteria) return [];
  return props.task.task.addition.acceptance_criteria.filter(
    (criteria) => criteria && criteria !== '',
  );
});

const validImplementationNotes = computed(() => {
  if (!props.task?.task.addition?.implementation_notes) return [];
  return props.task.task.addition.implementation_notes.filter(
    (note) => note && note !== '',
  );
});

const validDesignImages = computed(() => {
  if (!props.task?.task.addition?.design_images) return [];
  return props.task.task.addition.design_images.filter(
    (imageId) => imageId && imageId !== '',
  );
});

// 実装支援情報があるかどうかの判定
const hasImplementationInfo = computed(() => {
  return (
    validAcceptanceCriteria.value.length > 0 ||
    props.task?.task.addition?.ui_requirements ||
    props.task?.task.addition?.data_requirements ||
    validImplementationNotes.value.length > 0 ||
    validDesignImages.value.length > 0
  );
});
</script>

<style scoped>
/* 必要に応じてスタイルを追加 */
</style>
