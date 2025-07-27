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
import { ref, watch, onMounted } from 'vue';

import { TIMING } from '../../constants/timing';
import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';

// ストアからデータと関数を取得
const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();
const jsonInput = ref('');
let ignoreNextChange = false;
let isParsingJson = false;

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
  () => taskStore.editorTasks,
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

// 初期データロード
onMounted(async () => {
  if (taskStore.editorTasks.length === 0) {
    await taskStore.loadSampleData();
  }
});
</script>

<style scoped>
.json-input-container {
  width: 100%;
}
</style>
