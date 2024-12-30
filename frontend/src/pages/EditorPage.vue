<script setup lang="ts">
import EditorGrid from '../components/EditorGrid.vue';
import Switcher from '../components/Switcher.vue';
import TaskBar from '../components/TaskBar.vue';
</script>

<template>
  <div class="flex h-dvh flex-col justify-between">
    <Switcher />
    <EditorGrid />
    <TaskBar class="h-1/4" />
  </div>
</template>
