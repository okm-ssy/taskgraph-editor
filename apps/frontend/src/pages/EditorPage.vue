<script setup>
import { ref } from 'vue';

import Switcher from '../components/common/Switcher.vue';
import EditorGrid from '../components/editor/EditorGrid.vue';

const isSelecting = ref(false);
</script>

<template>
  <div class="flex h-dvh flex-col justify-between">
    <Switcher />
    <EditorGrid class="h-full" v-model:selecting="isSelecting" />
  </div>
</template>
