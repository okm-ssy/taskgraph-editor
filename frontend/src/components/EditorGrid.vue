<script setup lang="ts">
import { computed, ref } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useDragItem } from '../hooks/use_drag_item';

import EditorTaskCard from './EditorTaskCard.vue';
import TaskConnection, { type Connection } from './TaskConnection.vue';
import TaskSource from './TaskSource.vue';

const contentRef = ref<HTMLElement | null>(null);
const gridLayoutRef = ref<InstanceType<typeof GridLayout> | null>(null);

const {
  updateDragElement,
  handleDrop,
  editorTasks,
  layout,
  colNum,
  rowHeight,
} = useDragItem(contentRef, gridLayoutRef);

const connections = computed<Connection[]>(() => {
  if (editorTasks.value.length > 1) {
    return [
      {
        startId: `output-${editorTasks.value[0].id}`,
        endId: `input-${editorTasks.value[1].id}`,
      },
    ];
  }

  return [];
});
</script>

<template>
  <div class="bg-gray-200 h-full flex flex-col justify-between">
    <div class="absolute inset-0 pointer-events-none">
      <TaskConnection :connections class="relative pointer-events-none z-10" />
    </div>
    <div
      ref="contentRef"
      @dragover="updateDragElement"
      @drop="handleDrop"
      class="h-full"
    >
      <grid-layout
        ref="gridLayoutRef"
        v-model:layout="layout"
        :col-num="colNum"
        :row-height="rowHeight"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="false"
        :use-css-transforms="true"
      >
        <grid-item
          v-for="(item, index) in editorTasks"
          :key="item.grid.i"
          :x="item.grid.x"
          :y="item.grid.y"
          :w="item.grid.w"
          :h="item.grid.h"
          :i="item.grid.i"
          class="relative"
        >
          <EditorTaskCard v-model="editorTasks[index]" class="h-full" />
        </grid-item>
      </grid-layout>
    </div>
    <div class="bg-green-300 h-24">
      <TaskSource />
    </div>
  </div>
</template>
