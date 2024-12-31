<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import type { PropType } from 'vue';

import type { EditorTask } from '../model/EditorTask';

const props = defineProps({
  modelValue: {
    type: Object as PropType<EditorTask>,
    required: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const editorTask = useVModel(props, 'modelValue', emits);
</script>

<template>
  <div class="border p-2 flex flex-col w-full h-full overflow-hidden">
    <div class="text-gray-700 text-lg font-bold">
      {{ editorTask.task.name }}
    </div>
    <div class="text-gray-500 text-xs">
      {{ editorTask.task.description.replace(/\n/g, '') }}
    </div>
  </div>
</template>

<style scoped></style>
