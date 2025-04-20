<script setup lang="ts">
import EditorViewer from '../components/EditorViewer.vue';
import Switcher from '../components/Switcher.vue';
</script>

<template>
  <div class="flex h-dvh flex-col justify-between">
    <Switcher />
    <EditorViewer class="h-full" />
  </div>
</template>
