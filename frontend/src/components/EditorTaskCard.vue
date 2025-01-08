<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { ref, type PropType } from 'vue';

import { EditorTask } from '../model/EditorTask';

import EditorTaskDialog from './EditorTaskDialog.vue';

const props = defineProps({
  modelValue: {
    type: Object as PropType<EditorTask>,
    required: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const editorTask = useVModel(props, 'modelValue', emits);

// ダイアログの開閉状態
const isDialogOpen = ref(false);

// 開くボタンのクリックハンドラ
const handleOpen = () => {
  isDialogOpen.value = true;
};

// 閉じるときのハンドラ
const handleClose = () => {
  isDialogOpen.value = false;
};

// 外側クリックのハンドラ
const handleOutsideClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};
</script>

<template>
  <div
    class="border rounded-t-lg flex flex-col before w-full h-full overflow-hidden bg-white"
  >
    <div class="bg-green-600 h-8 rounded-t-lg flex justify-between px-4">
      <div :id="`input-${editorTask.id}`" class="text-red-300">●</div>
      <div :id="`output-${editorTask.id}`" class="text-green-300">●</div>
    </div>

    <button @click="handleOpen" class="flex flex-col h-full p-2">
      <div class="text-gray-700 text-lg font-bold">
        {{ editorTask.task.name }}
      </div>
      <div class="text-gray-500 text-xs">
        {{ editorTask.task.description.replace(/\n/g, '') }}
      </div>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="isDialogOpen"
      class="fixed inset-0 bg-black/30 flex items-center justify-center"
      @click="handleOutsideClick"
    >
      <EditorTaskDialog
        v-model="editorTask.task"
        @close="handleClose"
        class="w-3/4"
      />
    </div>
  </Teleport>
</template>

<style scoped></style>
