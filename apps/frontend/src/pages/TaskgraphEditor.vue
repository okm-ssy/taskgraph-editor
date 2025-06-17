<template>
  <div
    :class="[
      'w-full transition-all duration-200',
      isMinimalHeader ? 'p-1' : 'p-4',
    ]"
  >
    <h2
      :class="[
        'font-bold transition-all duration-200',
        isMinimalHeader ? 'text-sm mb-1' : 'text-xl mb-4',
      ]"
    >
      タスクグラフツール
    </h2>

    <div v-if="!isMinimalHeader">
      <div class="flex items-center gap-4 mb-4">
        <Switcher
          :modelValue="currentPage"
          @update:modelValue="navigateToPage"
        />
        <div class="flex items-center gap-2 border p-2 rounded-2xl">
          <button
            :class="[
              'px-4 py-2 rounded-md text-base transition-colors',
              isCompactMode
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
            ]"
            @click="toggleCompactMode"
            :title="`コンパクトモード: ${isCompactMode ? 'ON' : 'OFF'}`"
          >
            {{ isCompactMode ? 'コンパクト中' : 'コンパクト' }}
          </button>
          <button
            :class="[
              'px-4 py-2 rounded-md text-base transition-colors',
              isMinimalHeader
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
            ]"
            @click="toggleMinimalHeader"
            :title="`ヘッダー最小化: ${isMinimalHeader ? 'ON' : 'OFF'}`"
          >
            {{ isMinimalHeader ? 'ヘッダー最小中' : 'ヘッダー最小' }}
          </button>
        </div>
      </div>

      <JsonInput
        @parse-success="handleParseSuccess"
        @parse-error="handleParseError"
      />

      <div class="text-sm text-gray-500 my-4" v-if="taskCount > 0">
        {{ taskCount }}個のタスク
      </div>
    </div>

    <!-- 最小化時の簡潔な表示 -->
    <div v-if="isMinimalHeader" class="flex items-center gap-4 mb-2">
      <div class="flex gap-1">
        <button
          v-for="page in [
            { name: 'ビューア', id: 'viewer' },
            { name: 'エディタ', id: 'editor' },
          ]"
          :key="page.id"
          :class="[
            'px-2 py-1 text-xs rounded transition-colors',
            currentPage.id === page.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]"
          @click="
            navigateToPage(page.id === 'viewer' ? viewerPage : editorPage)
          "
        >
          {{ page.name }}
        </button>
      </div>
      <div class="flex gap-1">
        <button
          :class="[
            'px-2 py-1 text-xs rounded transition-colors',
            isCompactMode
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
          ]"
          @click="toggleCompactMode"
          :title="`コンパクトモード: ${isCompactMode ? 'ON' : 'OFF'}`"
        >
          {{ isCompactMode ? 'コンパクト中' : 'コンパクト' }}
        </button>
        <button
          :class="[
            'px-2 py-1 text-xs rounded transition-colors',
            isMinimalHeader
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
          ]"
          @click="toggleMinimalHeader"
          :title="`ヘッダー最小化: ${isMinimalHeader ? 'ON' : 'OFF'}`"
        >
          {{ isMinimalHeader ? 'ヘッダー最小中' : 'ヘッダー最小' }}
        </button>
      </div>
      <div v-if="taskCount > 0" class="text-xs text-gray-500">
        {{ taskCount }}個のタスク
      </div>
    </div>

    <ViewerPage
      v-if="currentPage.id === 'viewer'"
      :compact-mode="isCompactMode"
      :minimal-header="isMinimalHeader"
    />
    <EditorPage
      v-else-if="currentPage.id === 'editor'"
      :compact-mode="isCompactMode"
      :minimal-header="isMinimalHeader"
      @update:minimal-header="handleMinimalHeaderUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { STORAGE_KEYS } from '../constants';
import { useCurrentTasks } from '../store/task_store';
import { Page, viewerPage, editorPage } from '../store/types/page';

import EditorPage from './EditorPage.vue';
import ViewerPage from './ViewerPage.vue';

import JsonInput from '@/components/common/JsonInput.vue';
import Switcher from '@/components/common/Switcher.vue';

const router = useRouter();
const route = useRoute();
const taskStore = useCurrentTasks();

// URLに基づいて現在のページを設定
const currentPage = computed<Page>(() => {
  if (route.path === '/edit') {
    return editorPage;
  }
  return viewerPage;
});

const isMinimalHeader = ref(
  localStorage.getItem(STORAGE_KEYS.MINIMAL_HEADER) === 'true',
);
const isCompactMode = ref(
  localStorage.getItem(STORAGE_KEYS.COMPACT_MODE) === 'true',
);

// ページ切り替え時にルートを変更
const navigateToPage = (page: Page) => {
  if (page.id === 'editor') {
    router.push('/edit');
  } else {
    router.push('/view');
  }
};

// ストア初期化確認
onMounted(() => {
  taskStore.initializeStore();
});

const handleParseSuccess = (jsonString: string) => {
  taskStore.parseJsonToTaskgraph(jsonString);
};
const handleParseError = (errorMessage: string) => {
  console.error('JSONパースエラー(EditorViewer):', errorMessage);
};

const handleMinimalHeaderUpdate = (value: boolean) => {
  isMinimalHeader.value = value;
};

// コンパクトモードの切り替え
const toggleCompactMode = () => {
  isCompactMode.value = !isCompactMode.value;
  localStorage.setItem(
    STORAGE_KEYS.COMPACT_MODE,
    isCompactMode.value.toString(),
  );
};

// ヘッダー最小化モードの切り替え
const toggleMinimalHeader = () => {
  isMinimalHeader.value = !isMinimalHeader.value;
  localStorage.setItem(
    STORAGE_KEYS.MINIMAL_HEADER,
    isMinimalHeader.value.toString(),
  );
};

const taskCount = computed(() => taskStore.editorTasks.length);
</script>

<style scoped lang="scss" />
