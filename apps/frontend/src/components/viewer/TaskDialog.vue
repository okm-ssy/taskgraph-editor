<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-gray-600/75 flex items-center justify-center z-50 p-4"
    @mousedown="onClickOutside"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="title ? 'dialog-title' : undefined"
  >
    <div
      class="modal-content bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
    >
      <div
        class="flex justify-between items-center border-b p-4 sticky top-0 bg-white rounded-t-lg"
      >
        <h3
          v-if="title"
          id="dialog-title"
          class="text-lg font-semibold text-gray-800 truncate"
        >
          {{ title }}
        </h3>
        <div v-else />
        <button
          @click="closeDialog"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-grow p-5">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean;
  title?: string; // ダイアログのタイトルをオプションで受け取る
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const closeDialog = () => {
  emit('close');
};

// 背景クリックで閉じる
const onClickOutside = (event: MouseEvent) => {
  // event.target が modal-content の外側(.fixed) かどうかを判定
  if (event.target === event.currentTarget) {
    closeDialog();
  }
};
</script>

<style scoped>
/* スクロールバーのスタイル */
.modal-content ::-webkit-scrollbar {
  width: 6px;
}
.modal-content ::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.modal-content ::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.modal-content ::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
.modal-content {
  scrollbar-width: thin;
  scrollbar-color: #ccc #f1f1f1;
}
</style>
