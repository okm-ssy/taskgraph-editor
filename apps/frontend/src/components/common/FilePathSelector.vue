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
        <div
          class="w-4 h-4 flex-shrink-0"
          v-html="getFileIconForPath(path)"
          :style="{ color: getFileIconColorForPath(path) }"
        />
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
          @keydown="handleKeydown"
        />
      </div>

      <!-- 検索結果 -->
      <div
        v-if="showResults"
        class="file-search-results bg-white border border-gray-300 rounded-md max-h-48 overflow-y-auto shadow-sm"
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
            v-for="(file, index) in searchResults"
            :key="file.path"
            type="button"
            @click="addFile(file.path)"
            class="file-search-item w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors"
            :class="{
              'opacity-50': isAlreadySelected(file.path),
              'bg-blue-100': index === selectedIndex,
            }"
            :disabled="isAlreadySelected(file.path)"
          >
            <div class="text-sm font-mono flex items-center gap-2">
              <div
                class="w-4 h-4 flex-shrink-0"
                v-html="getFileIcon(file.name)"
                :style="{ color: getFileIconColor(file.name) }"
              />
              <span class="text-blue-700">{{ file.name }}</span>
              <span class="text-xs text-gray-500 ml-2">{{
                file.directory
              }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 新規ファイル追加セクション -->
    <div class="border-t pt-3 mt-3">
      <div class="flex gap-2">
        <input
          v-model="newFilePath"
          type="text"
          placeholder="新規ファイルパスを入力（例: src/components/NewComponent.vue）"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          @keydown.enter="addNewFile"
        />
        <button
          type="button"
          @click="addNewFile"
          class="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md cursor-pointer transition-colors"
          :disabled="!newFilePath.trim()"
        >
          追加
        </button>
      </div>
    </div>

    <!-- ヘルプテキスト -->
    <div class="text-xs text-gray-600 space-y-1">
      <p>このタスクに関連するファイルパスを追加できます。</p>
      <p>• <strong>既存ファイル</strong>: 上の検索ボックスから選択</p>
      <p>• <strong>新規ファイル</strong>: 下の入力欄に作成予定のパスを入力</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getIcon } from 'material-file-icons';
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
const selectedIndex = ref(-1); // 選択中のアイテムのインデックス
const newFilePath = ref(''); // 新規ファイルパス入力用

// ファイルパス検索のComposableを使用
const {
  searchQuery,
  searchResults,
  isLoading,
  error,
  loadFiles,
  isFileExists,
} = useFilePathSearch(props.rootPath || '');

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
  selectedIndex.value = -1; // フォーカス時に選択をリセット
  if (!searchResults.value.length && props.rootPath) {
    loadFiles();
  }
};

// キーボードナビゲーション処理
const handleKeydown = (event: KeyboardEvent) => {
  if (!showResults.value || searchResults.value.length === 0) {
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        searchResults.value.length - 1,
      );
      scrollToSelected();
      break;

    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
      scrollToSelected();
      break;

    case 'Enter':
      event.preventDefault();
      if (
        selectedIndex.value >= 0 &&
        selectedIndex.value < searchResults.value.length
      ) {
        const selectedFile = searchResults.value[selectedIndex.value];
        if (!isAlreadySelected(selectedFile.path)) {
          addFile(selectedFile.path);
        }
      }
      break;

    case 'Escape':
      showResults.value = false;
      selectedIndex.value = -1;
      break;
  }
};

// 選択中のアイテムが見えるようにスクロール
const scrollToSelected = () => {
  if (selectedIndex.value < 0) return;

  const container = document.querySelector('.file-search-results');
  const items = container?.querySelectorAll('.file-search-item');

  if (items && items[selectedIndex.value]) {
    items[selectedIndex.value].scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }
};

// ファイルを追加
const addFile = (path: string) => {
  if (!isAlreadySelected(path)) {
    const newValue = [...(props.modelValue || []), path];
    emit('update:modelValue', newValue);
  }
  // 検索はクリアしないで、選択インデックスだけリセット
  selectedIndex.value = -1;
};

// ファイルを削除
const removeFile = (index: number) => {
  const newValue = [...(props.modelValue || [])];
  newValue.splice(index, 1);
  emit('update:modelValue', newValue);
};

// 新規ファイルを追加
const addNewFile = () => {
  const path = newFilePath.value.trim();
  if (path && !isAlreadySelected(path)) {
    const newValue = [...(props.modelValue || []), path];
    emit('update:modelValue', newValue);
    newFilePath.value = ''; // 入力をクリア
  }
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

// material-file-iconsからアイコンを取得
const getFileIcon = (filename: string): string => {
  try {
    const icon = getIcon(filename);
    return icon?.svg || getDefaultFileIcon();
  } catch {
    return getDefaultFileIcon();
  }
};

// アイコンの色を取得（material-file-iconsの色情報を使用）
const getFileIconColor = (filename: string): string => {
  try {
    const icon = getIcon(filename);
    return icon?.color || '#6b7280'; // デフォルトはgray-500
  } catch {
    return '#6b7280';
  }
};

// パス用のアイコンを取得（新規ファイルかどうかを判定）
const getFileIconForPath = (filePath: string): string => {
  const filename = filePath.split('/').pop() || filePath;

  // 新規ファイルかどうかの判定（簡易版）
  // 実際には存在チェックが必要だが、今は新規入力されたものとして扱う
  if (isNewFile(filePath)) {
    return getNewFileIcon();
  }

  return getFileIcon(filename);
};

// パス用の色を取得
const getFileIconColorForPath = (filePath: string): string => {
  if (isNewFile(filePath)) {
    return '#10b981'; // green-500
  }

  const filename = filePath.split('/').pop() || filePath;
  return getFileIconColor(filename);
};

// 新規ファイルかどうかの判定
const isNewFile = (filePath: string): boolean => {
  // ファイルが実際に存在するかチェック
  return !isFileExists(filePath);
};

// 新規ファイル用のアイコン
const getNewFileIcon = (): string => {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /><path d="M15,13H17V15H19V17H17V19H15V17H13V15H15V13Z" /></svg>';
};

// デフォルトのファイルアイコン
const getDefaultFileIcon = (): string => {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
};

// コンポーネントアンマウント時にイベントリスナーを削除
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped></style>
