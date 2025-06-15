<template>
  <div class="my-4">
    <div class="flex gap-2 mb-4">
      <button
        v-for="page in pages"
        :key="page.id"
        :class="[
          'px-4 py-2 rounded-md text-base transition-colors',
          currentPage.id === page.id
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
        ]"
        @click="switchPage(page)"
      >
        {{ page.name }}
      </button>
    </div>
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
