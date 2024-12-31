<template>
  <div
    @drag="updateDragElement"
    @dragover="updateDragElement"
    @drop="handleDrop"
    class="droppable-element"
    draggable="true"
    unselectable="on"
  >
    追加
  </div>
</template>

<script setup lang="ts">
import { useCurrentDragItem } from '../hooks/use_drag_item';

const { updateDragElement, handleDrop } = useCurrentDragItem();
</script>

<style scoped></style>
