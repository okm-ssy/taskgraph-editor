<template>
  <div class="json-input-container">
    <!-- JSON入力パネル切り替えボタン -->
    <div class="flex justify-between items-center mb-4">
      <button
        @click="taskStore.toggleJsonInputVisibility"
        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        {{
          taskStore.jsonInputVisible ? 'JSONパネルを閉じる' : 'JSONパネルを開く'
        }}
      </button>
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

import { useCurrentTasks } from '../../store/task_store';

// ストアからデータと関数を取得
const taskStore = useCurrentTasks();
const jsonInput = ref('');
let ignoreNextChange = false;

// textarea内容が変更されたら自動的にパースする
watch(jsonInput, () => {
  if (ignoreNextChange) {
    ignoreNextChange = false;
    return;
  }
  taskStore.parseJsonString(jsonInput.value);
});

// ストアの状態が変更されたらtextareaの内容を更新する
watch(
  () => taskStore.editorTasks,
  () => {
    ignoreNextChange = true;
    jsonInput.value = taskStore.exportTaskgraphToJson();
  },
  { deep: true },
);

// コンポーネント初期化時にサンプルデータをロード
onMounted(() => {
  // ストアからサンプルデータをロード
  taskStore.loadSampleData();
});
</script>

<style scoped>
.json-input-container {
  width: 100%;
}
</style>