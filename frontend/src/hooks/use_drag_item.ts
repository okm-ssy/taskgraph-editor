import {
  inject,
  provide,
  readonly,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue';
import type { GridLayout } from 'vue3-grid-layout-next';

import type { GridTask } from '../model/GridTask';

const DRAG_ITEM_INJECTION_KEY: InjectionKey<DragItemContext> =
  Symbol('drag_item');

export function useDragItem(
  currentContentRef: Ref<HTMLElement | null>,
  currentGridLayoutRef: Ref<InstanceType<typeof GridLayout> | null>,
) {
  const mouseXY = ref({ x: 0, y: 0 });
  const DragPos = ref<GridTask>({ x: 0, y: 0, w: 1, h: 1, i: '0' });
  const contentRef = currentContentRef;
  const gridLayoutRef = currentGridLayoutRef;
  const layout = ref<GridTask[]>([]);

  const counter = ref(0);

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
      const pos = calcGridPosition(
        parentRect,
        mouseXY.value.x,
        mouseXY.value.y,
      );
      layout.value = [
        ...layout.value.filter((obj) => obj.i !== 'drop'),
        {
          x: pos.x,
          y: pos.y,
          w: 1,
          h: 1,
          i: String(counter.value++),
        },
      ];
    }
  };

  const context = {
    mouseXY: readonly(mouseXY),
    DragPos: readonly(DragPos),
    counter: readonly(counter),
    layout,
    updateDragElement,
    handleDrop,
  };

  provide(DRAG_ITEM_INJECTION_KEY, context);

  return context;
}

export function useCurrentDragItem() {
  return inject(DRAG_ITEM_INJECTION_KEY, {
    mouseXY: ref({ x: 0, y: 0 }),
    DragPos: ref<GridTask>({ x: 0, y: 0, w: 1, h: 1, i: '0' }),
    counter: ref(0),
    layout: ref<GridTask[]>([]),
    updateDragElement: (_e: DragEvent) => {},
    handleDrop: (_e: DragEvent) => {},
  });
}

export type DragItemContext = ReturnType<typeof useDragItem>;

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
