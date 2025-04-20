<script setup lang="ts">
import { ref, defineEmits, watch, onMounted } from 'vue';

import { useCurrentTasks } from '../store/task_store';

const emit = defineEmits(['parse-success', 'parse-error']);

const jsonInput = ref('');
const parseError = ref<string | null>(null);
const showJsonInput = ref(false);
const taskStore = useCurrentTasks();
let ignoreNextChange = false;

// JSONテキストをパースする
const parseJsonInput = () => {
  parseError.value = null;

  if (!jsonInput.value.trim()) {
    parseError.value = 'JSONテキストを入力してください';
    emit('parse-error', parseError.value);
    return;
  }

  try {
    // JSON形式チェック
    JSON.parse(jsonInput.value);

    // 親コンポーネントに解析成功イベントを発行
    emit('parse-success', jsonInput.value);
  } catch (error) {
    parseError.value = `JSON解析エラー: ${(error as Error).message}`;
    emit('parse-error', parseError.value);
  }
};

// textareaの内容が変更されたら自動的にパースする
watch(jsonInput, () => {
  if (ignoreNextChange) {
    ignoreNextChange = false;
    return;
  }
  parseJsonInput();
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
  // テキストエリアに反映（watchが自動的に反映してくれる）
});
</script>

<template>
  <div class="json-input-container">
    <!-- JSON入力パネル切り替えボタン -->
    <div class="flex justify-between items-center mb-4">
      <button
        @click="showJsonInput = !showJsonInput"
        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        {{ showJsonInput ? 'JSONパネルを閉じる' : 'JSONを貼り付ける' }}
      </button>
    </div>

    <!-- JSON入力パネル -->
    <div
      v-if="showJsonInput"
      class="mb-4 border border-gray-300 rounded-lg p-4 bg-white"
    >
      <h3 class="text-lg font-bold mb-2">JSONデータ入力/出力</h3>

      <textarea
        v-model="jsonInput"
        class="w-full h-64 border border-gray-300 rounded p-2 font-mono text-sm"
        placeholder="ここにJSONデータを貼り付けてください"
      />

      <div class="flex justify-between items-center mt-2">
        <div class="text-red-500 text-sm" v-if="parseError">
          {{ parseError }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-input-container {
  width: 100%;
}
</style>
