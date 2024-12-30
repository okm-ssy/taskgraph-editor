<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GridLayout, GridItem } from 'vue3-grid-layout-next';

import type { GridTask } from '../model/GridTask';

const mouseXY = ref({ x: 0, y: 0 });
const DragPos = ref<GridTask>({ x: 0, y: 0, w: 1, h: 1, i: '0' });
const contentRef = ref<HTMLElement | null>(null);
const gridLayoutRef = ref<InstanceType<typeof GridLayout> | null>(null);
const layout = ref<GridTask[]>([]);
let counter = 0;

const calcGridPosition = (
  parentRect: DOMRect,
  mouseX: number,
  mouseY: number,
) => {
  // スクロール位置を考慮した計算に修正
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const offsetX = mouseX - parentRect.left;
  const offsetY = mouseY + scrollTop - parentRect.top;

  // グリッドの範囲内に収める
  const x = Math.max(
    0,
    Math.min(Math.floor(offsetX / (parentRect.width / 12)), 11),
  );
  const y = Math.max(0, Math.floor(offsetY / 30));

  return { x, y };
};

const updateDragElement = (e: DragEvent) => {
  e.preventDefault();
  mouseXY.value = { x: e.clientX, y: e.clientY };

  const parentRect = contentRef.value?.getBoundingClientRect();
  if (!parentRect) return;

  // スクロール位置を考慮したマウス位置判定
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const mouseY = e.clientY + scrollTop;

  const mouseInGrid =
    mouseXY.value.x > parentRect.left &&
    mouseXY.value.x < parentRect.right &&
    mouseY > parentRect.top &&
    mouseY < parentRect.bottom;

  const pos = calcGridPosition(parentRect, mouseXY.value.x, mouseXY.value.y);

  if (!layout.value.find((item) => item.i === 'drop')) {
    layout.value.push({
      x: pos.x,
      y: pos.y,
      w: 1,
      h: 1,
      i: 'drop',
    });
  }

  const index = layout.value.findIndex((item) => item.i === 'drop');
  if (index !== -1) {
    if (mouseInGrid) {
      layout.value[index] = { ...layout.value[index], x: pos.x, y: pos.y };
      gridLayoutRef.value?.dragEvent('dragstart', 'drop', pos.x, pos.y, 1, 1);
    } else {
      gridLayoutRef.value?.dragEvent('dragend', 'drop', pos.x, pos.y, 1, 1);
      layout.value = layout.value.filter((obj) => obj.i !== 'drop');
    }
  }

  DragPos.value = {
    i: String(counter),
    x: pos.x,
    y: pos.y,
    w: 1,
    h: 1,
  };
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const parentRect = contentRef.value?.getBoundingClientRect();
  if (!parentRect) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const mouseY = e.clientY + scrollTop;

  const mouseInGrid =
    mouseXY.value.x > parentRect.left &&
    mouseXY.value.x < parentRect.right &&
    mouseY > parentRect.top &&
    mouseY < parentRect.bottom;

  if (mouseInGrid) {
    const pos = calcGridPosition(parentRect, mouseXY.value.x, mouseXY.value.y);
    layout.value = [
      ...layout.value.filter((obj) => obj.i !== 'drop'),
      {
        x: pos.x,
        y: pos.y,
        w: 1,
        h: 1,
        i: String(counter++),
      },
    ];
  }
};

onMounted(() => {
  document.addEventListener('dragover', (e: DragEvent) => e.preventDefault());
  document.addEventListener('drop', (e: DragEvent) => e.preventDefault());
});
</script>

<template>
  <div class="bg-blue-400">
    <div
      @drag="updateDragElement"
      @dragover="updateDragElement"
      @drop="handleDrop"
      class="droppable-element"
      draggable="true"
      unselectable="on"
    >
      Droppable Element (Drag me!)
    </div>
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
