<template>
  <div class="relative inline-flex bg-gray-200 rounded-lg p-1">
    <button
      v-for="page in pages"
      :key="page.id"
      :class="[
        'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 z-10',
        currentPage.id === page.id
          ? 'text-blue-600'
          : 'text-gray-500 hover:text-gray-700',
      ]"
      @click="switchPage(page)"
    >
      {{ page.name }}
    </button>
    <!-- スライドする背景 -->
    <div
      :class="[
        'absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-transform duration-200 ease-in-out',
        'w-[calc(50%-0.125rem)]',
        currentPage.id === 'editor' ? 'translate-x-full' : 'translate-x-0',
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { Page } from '@/store/types/page';

const props = defineProps<{
  modelValue: Page;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Page): void;
}>();

// 切り替え先のページオプション
const pages: Page[] = [
  { name: 'ビューア', id: 'viewer' },
  { name: 'エディタ', id: 'editor' },
];

// 現在選択されているページ
const currentPage = computed({
  get: () => props.modelValue,
  set: (value: Page) => emit('update:modelValue', value),
});

// ページ切り替え処理
const switchPage = (page: Page) => {
  currentPage.value = page;
};
</script>
