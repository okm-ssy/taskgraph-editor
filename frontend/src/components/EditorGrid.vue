<script setup lang="ts">
import { ref } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import { useDragItem } from '../hooks/use_drag_item';

import TaskSource from './TaskSource.vue';

// const mouseXY = ref({ x: 0, y: 0 });
// const DragPos = ref<GridTask>({ x: 0, y: 0, w: 1, h: 1, i: '0' });
const contentRef = ref<HTMLElement | null>(null);
const gridLayoutRef = ref<InstanceType<typeof GridLayout> | null>(null);

const { updateDragElement, handleDrop, layout } = useDragItem(
  contentRef,
  gridLayoutRef,
);
</script>

<template>
  <div class="bg-green-300">
    <TaskSource />
    <div
      ref="contentRef"
      @dragover="updateDragElement"
      @drop="handleDrop"
      class="min-h-screen"
    >
      <grid-layout
        ref="gridLayoutRef"
        v-model:layout="layout"
        :col-num="12"
        :row-height="30"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="false"
        :use-css-transforms="true"
      >
        <grid-item
          v-for="item in layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
        >
          <span class="text">{{ item.i }}</span>
        </grid-item>
      </grid-layout>
    </div>
  </div>
</template>
