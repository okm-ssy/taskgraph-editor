<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-blue-700 mb-1">
      関連ファイル
    </label>

    <!-- 選択済みファイル一覧 -->
    <div v-if="modelValue && modelValue.length > 0" class="space-y-1">
      <div
        v-for="(path, index) in modelValue"
        :key="index"
        class="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm"
      >
        <span class="flex-1 text-blue-800 font-mono">{{ path }}</span>
        <button
          type="button"
          @click="removeFile(index)"
          class="text-blue-600 hover:text-red-600 font-medium cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>

    <!-- ファイル検索・追加セクション -->
    <div
      class="file-path-search-container bg-gray-50 border-2 border-gray-300 rounded-md p-3 shadow-inner"
    >
      <!-- 検索入力 -->
      <div class="mb-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ファイルパスを検索..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          @focus="handleSearchFocus"
        />
      </div>

      <!-- 検索結果 -->
      <div
        v-if="showResults"
        class="bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto shadow-sm"
      >
        <div v-if="isLoading" class="p-3 text-center text-gray-500 text-sm">
          ファイル一覧を読み込み中...
        </div>

        <div v-else-if="error" class="p-3 text-center text-red-600 text-sm">
          {{ error }}
        </div>

        <div
          v-else-if="searchResults.length === 0"
          class="p-3 text-center text-gray-500 text-sm"
        >
          ファイルが見つかりません
        </div>

        <div v-else>
          <button
            v-for="file in searchResults"
            :key="file.path"
            type="button"
            @click="addFile(file.path)"
            class="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors"
            :class="{ 'opacity-50': isAlreadySelected(file.path) }"
            :disabled="isAlreadySelected(file.path)"
          >
            <div class="text-sm font-mono text-gray-800">{{ file.path }}</div>
            <div class="text-xs text-gray-500">{{ file.directory }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- ヘルプテキスト -->
    <p class="text-xs text-gray-600">
      このタスクに関連するファイルパスを追加できます。検索して選択してください。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

import { useFilePathSearch } from '../../composables/useFilePathSearch';

const props = defineProps<{
  modelValue: string[];
  rootPath?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const showResults = ref(false);

// ファイルパス検索のComposableを使用
const { searchQuery, searchResults, isLoading, error, loadFiles, clearSearch } =
  useFilePathSearch(props.rootPath || '');

// ルートパスが変更されたときにファイル一覧を再読み込み
watch(
  () => props.rootPath,
  (newRootPath) => {
    if (newRootPath) {
      loadFiles();
    }
  },
  { immediate: true },
);

// 検索フォーカス時の処理
const handleSearchFocus = () => {
  showResults.value = true;
  if (!searchResults.value.length && props.rootPath) {
    loadFiles();
  }
};

// ファイルを追加
const addFile = (path: string) => {
  if (!isAlreadySelected(path)) {
    const newValue = [...(props.modelValue || []), path];
    emit('update:modelValue', newValue);
  }
  clearSearch();
  showResults.value = false;
};

// ファイルを削除
const removeFile = (index: number) => {
  const newValue = [...(props.modelValue || [])];
  newValue.splice(index, 1);
  emit('update:modelValue', newValue);
};

// 既に選択されているかチェック
const isAlreadySelected = (path: string) => {
  return props.modelValue?.includes(path) || false;
};

// 検索ボックス外のクリックで閉じる処理
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const searchContainer = document.querySelector('.file-path-search-container');

  // 検索コンテナ外をクリックした場合のみ閉じる
  if (searchContainer && !searchContainer.contains(target)) {
    showResults.value = false;
  }
};

// コンポーネントマウント時にイベントリスナーを追加
onMounted(() => {
  // 少し遅延を入れて、初期レンダリング後に追加
  setTimeout(() => {
    document.addEventListener('click', handleDocumentClick);
  }, 100);
});

// コンポーネントアンマウント時にイベントリスナーを削除
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped></style>
