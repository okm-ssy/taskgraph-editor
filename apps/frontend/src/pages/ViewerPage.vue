<template>
  <div class="flex h-dvh flex-col justify-between">
    <EditorViewer
      class="h-full"
      :compact-mode="props.compactMode"
      :minimal-header="props.minimalHeader"
    />
  </div>
</template>

<script setup lang="ts">
import EditorViewer from '../components/viewer/EditorViewer.vue';

const props = defineProps<{
  compactMode?: boolean;
  minimalHeader?: boolean;
}>();
</script>
