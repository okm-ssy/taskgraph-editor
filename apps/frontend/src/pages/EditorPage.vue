<template>
  <div class="flex h-dvh flex-col">
    <EditorGrid v-model:selecting="isSelecting" class="h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import EditorGrid from '../components/editor/EditorGrid.vue';

const isSelecting = ref(false);
</script>

<style scoped></style>
