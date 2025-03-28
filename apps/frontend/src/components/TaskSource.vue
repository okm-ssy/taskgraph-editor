<script setup lang="ts">
import { useCurrentDragItem } from '../hooks/use_drag_item';

const { updateDragElement, handleDrop } = useCurrentDragItem();
</script>

<template>
  <div
    @drag="updateDragElement"
    @dragover="updateDragElement"
    @drop="handleDrop"
    draggable="true"
    unselectable="on"
  >
    追加
  </div>
</template>

<style scoped></style>
