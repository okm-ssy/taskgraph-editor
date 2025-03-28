import _ from 'lodash';
import {
  computed,
  inject,
  provide,
  readonly,
  ref,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue';
import type { GridLayout } from 'vue3-grid-layout-next';

import type { GridTask } from '../model/GridTask';

import { useCurrentTasks } from './use_task_store';

const colNum = 12;
const rowHeight = 30;

const DRAG_ITEM_INJECTION_KEY: InjectionKey<DragItemContext> =
  Symbol('drag-item');

export interface DragItemContext {
  mouseXY: Readonly<Ref<{ x: number; y: number }>>;
  dragPos: Readonly<Ref<GridTask>>;
  counter: Readonly<Ref<number>>;
  layout: ComputedRef<GridTask[]>;
  colNum: number;
  rowHeight: number;
  updateDragElement: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
}

export const useDragItem = (
  currentContentRef: Ref<HTMLElement | null>,
  currentGridLayoutRef: Ref<InstanceType<typeof GridLayout> | null>,
) => {
  const mouseXY = ref({ x: 0, y: 0 });
  const dragPos = ref<GridTask>({ x: 0, y: 0, w: 2, h: 3, i: '0' });
  const contentRef = currentContentRef;
  const gridLayoutRef = currentGridLayoutRef;
  const counter = ref(0);

  // Pinia store
  const editorTaskStore = useCurrentTasks();
  const layout = computed({
    get: () => editorTaskStore.layout,
    set: (value) => editorTaskStore.updateLayout(value),
  });

  const updateDragElement = (e: DragEvent) => {
    e.preventDefault();
    mouseXY.value = { x: e.clientX, y: e.clientY };

    if (!contentRef.value) return;
    const parentRect = contentRef.value?.getBoundingClientRect();
    if (!parentRect) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const mouseY = e.clientY + scrollTop;

    const mouseInGrid =
      mouseXY.value.x > parentRect.left &&
      mouseXY.value.x < parentRect.right &&
      mouseY > parentRect.top &&
      mouseY < parentRect.bottom;

    const pos = calcGridPosition(parentRect, mouseXY.value.x, mouseXY.value.y);

    const index = layout.value.findIndex((item) => item.i === 'drop');
    if (index === -1) {
      const newLayout = [
        ...layout.value,
        {
          x: pos.x,
          y: pos.y,
          w: 2,
          h: 3,
          i: 'drop',
        },
      ];
      editorTaskStore.updateLayout(newLayout);
    } else {
      if (mouseInGrid) {
        const newLayout = [...layout.value];
        newLayout[index].x = pos.x;
        newLayout[index].y = pos.y;
        editorTaskStore.updateLayout(newLayout);
        gridLayoutRef.value?.dragEvent('dragstart', 'drop', pos.x, pos.y, 3, 2);
      } else {
        gridLayoutRef.value?.dragEvent('dragend', 'drop', pos.x, pos.y, 3, 2);
        layout.value = layout.value.filter((obj) => obj.i !== 'drop');
      }
    }

    dragPos.value = {
      i: String(counter.value),
      x: pos.x,
      y: pos.y,
      w: 2,
      h: 3,
    };
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();

    if (!contentRef.value) return;
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
      const pos = calcGridPosition(
        parentRect,
        mouseXY.value.x,
        mouseXY.value.y,
      );

      const newLayout = [
        ...layout.value.filter((obj) => obj.i !== 'drop'),
        {
          x: pos.x,
          y: pos.y,
          w: 2,
          h: 3,
          i: String(counter.value++),
        } as GridTask,
      ];

      // Piniaストアを介して更新
      editorTaskStore.updateLayout(newLayout);
    }
  };

  const context = {
    mouseXY: readonly(mouseXY),
    dragPos: readonly(dragPos),
    counter: readonly(counter),
    layout: computed({
      get: () => editorTaskStore.layout,
      set: (value) => editorTaskStore.updateLayout(value),
    }),
    colNum,
    rowHeight,
    updateDragElement,
    handleDrop,
  };

  provide(DRAG_ITEM_INJECTION_KEY, context);

  return context;
};

export const useCurrentDragItem = () => {
  return inject(DRAG_ITEM_INJECTION_KEY, {
    mouseXY: ref({ x: 0, y: 0 }),
    dragPos: ref<GridTask>({ x: 0, y: 0, w: 2, h: 3, i: '0' }),
    counter: ref(0),
    layout: ref<GridTask[]>([]),
    colNum: 1,
    rowHeight: 1,
    updateDragElement: (_e: DragEvent) => {},
    handleDrop: (_e: DragEvent) => {},
  });
};

const calcGridPosition = (
  parentRect: DOMRect,
  mouseX: number,
  mouseY: number,
) => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const offsetX = mouseX - parentRect.left;
  const offsetY = mouseY + scrollTop - parentRect.top;

  const x = Math.max(
    0,
    Math.min(Math.floor(offsetX / (parentRect.width / colNum)), colNum - 1),
  );

  const y = Math.max(0, Math.min(Math.floor(offsetY / 40), rowHeight - 1));

  return { x, y };
};
