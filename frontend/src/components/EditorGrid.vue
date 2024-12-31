<script setup lang="ts">
import { ref } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useDragItem } from '../hooks/use_drag_item';

import EditorTaskCard from './EditorTaskCard.vue';
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
</script>

<template>
  <div class="bg-gray-200 h-full flex flex-col justify-between">
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
          v-for="item in editorTasks"
          :key="item.grid.i"
          :x="item.grid.x"
          :y="item.grid.y"
          :w="item.grid.w"
          :h="item.grid.h"
          :i="item.grid.i"
        >
          <EditorTaskCard v-model="item.task" class="h-full" />
        </grid-item>
      </grid-layout>
    </div>
    <div class="bg-green-300 h-24">
      <TaskSource />
    </div>
  </div>
</template>
