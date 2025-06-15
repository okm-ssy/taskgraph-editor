<template>
  <div class="flex h-dvh flex-col justify-between">
    <EditorViewer 
      class="h-full" 
      @update:minimal-header="handleMinimalHeaderUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import EditorViewer from '../components/viewer/EditorViewer.vue';

const emit = defineEmits<{
  (e: 'update:minimal-header', value: boolean): void;
}>();

const handleMinimalHeaderUpdate = (value: boolean) => {
  emit('update:minimal-header', value);
};
</script>
