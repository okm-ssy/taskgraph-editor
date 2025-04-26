<script setup lang="ts">
import Switcher from '../components/common/Switcher.vue';
import EditorViewer from '../components/viewer/EditorViewer.vue';
</script>

<template>
  <div class="flex h-dvh flex-col justify-between">
    <Switcher />
    <EditorViewer class="h-full" />
  </div>
</template>
