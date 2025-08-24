<template>
  <div class="json-input-container">
    <!-- JSON入力パネル切り替えボタン -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-2">
        <button
          @click="taskStore.toggleJsonInputVisibility"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          {{
            taskStore.jsonInputVisible
              ? 'JSONパネルを閉じる'
              : 'JSONパネルを開く'
          }}
        </button>
        <button
          @click="uiStore.openInfoDialog"
          class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          プロジェクト情報
        </button>
        <a
          v-if="hasGitHubProjectInfo"
          :href="gitHubProjectUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="w-4 h-4"
          >
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            ></path>
          </svg>
          GitHub
        </a>
      </div>
    </div>

    <!-- JSON入力パネル -->
    <div
      v-if="taskStore.jsonInputVisible"
      class="mb-4 border border-gray-300 rounded-lg p-4 bg-white"
    >
      <h3 class="text-lg font-bold mb-2">JSONデータ入力・出力</h3>

      <textarea
        v-model="jsonInput"
        class="w-full h-64 border border-gray-300 rounded p-2 font-mono text-sm"
        placeholder="ここにJSONデータを貼り付けてください"
      />

      <div class="flex justify-between items-center mt-2">
        <div class="text-red-500 text-sm" v-if="taskStore.taskLoadError">
          {{ taskStore.taskLoadError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { TIMING } from '../../constants/timing';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

// ストアからデータと関数を取得
const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const jsonInput = ref('');
let ignoreNextChange = false;
let isParsingJson = false;

// GitHub Projectsへのリンク情報
const hasGitHubProjectInfo = computed(() => {
  return (
    taskStore.info?.github?.organization &&
    taskStore.info?.github?.projectNumber
  );
});

const gitHubProjectUrl = computed(() => {
  if (!hasGitHubProjectInfo.value) return '';
  const { organization, projectNumber } = taskStore.info.github!;
  return `https://github.com/orgs/${organization}/projects/${projectNumber}/views/2`;
});

// textarea内容が変更されたら自動的にパースする
watch(jsonInput, () => {
  if (ignoreNextChange) {
    ignoreNextChange = false;
    return;
  }

  // JSONパース中フラグを立てる
  isParsingJson = true;
  taskStore.parseJsonString(jsonInput.value);
  // パース完了後、少し待ってからフラグを下げる
  setTimeout(() => {
    isParsingJson = false;
  }, TIMING.JSON_PARSE.FLAG_RESET_MS);
});

// ストアの状態が変更されたらtextareaの内容を更新する
watch(
  [() => taskStore.editorTasks, () => taskStore.info],
  () => {
    // JSONパース中は自動エクスポートを無効にする
    if (isParsingJson) {
      return;
    }

    ignoreNextChange = true;
    jsonInput.value = taskStore.exportTaskgraphToJson();
  },
  { deep: true },
);
</script>

<style scoped>
.json-input-container {
  width: 100%;
}
</style>
