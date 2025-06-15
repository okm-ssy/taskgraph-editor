<template>
  <div class="flex h-dvh flex-col">
    <EditorGrid
      v-model:selecting="isSelecting"
      @update:minimal-header="handleMinimalHeaderUpdate"
      :compact-mode="props.compactMode"
      :minimal-header="props.minimalHeader"
      class="h-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import EditorGrid from '../components/editor/EditorGrid.vue';

const props = defineProps<{
  compactMode?: boolean;
  minimalHeader?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:minimal-header', value: boolean): void;
}>();

const isSelecting = ref(false);

const handleMinimalHeaderUpdate = (value: boolean) => {
  emit('update:minimal-header', value);
};
</script>

<style scoped></style>
