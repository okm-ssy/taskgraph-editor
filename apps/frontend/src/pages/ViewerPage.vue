<template>
  <div class="flex h-dvh flex-col justify-between">
    <EditorViewer class="h-full" :compact-mode="props.compactMode" />
  </div>
</template>

<script setup lang="ts">
import EditorViewer from '../components/viewer/EditorViewer.vue';

const props = defineProps<{
  compactMode?: boolean;
}>();
</script>
