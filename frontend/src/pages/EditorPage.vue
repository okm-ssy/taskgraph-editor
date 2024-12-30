<script setup>
import { ref } from 'vue';

import EditorGrid from '../components/EditorGrid.vue';
import Switcher from '../components/Switcher.vue';

const isSelecting = ref(false);
</script>

<template>
  <div class="flex h-dvh flex-col justify-between">
    <Switcher />
    <EditorGrid class="h-1/2" v-model:selecting="isSelecting" />
  </div>
</template>
