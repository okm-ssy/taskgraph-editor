import _ from 'lodash';
import {
  computed,
  inject,
  provide,
  readonly,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue';
import type { GridLayout } from 'vue3-grid-layout-next';

import { EditorTask } from '../model/EditorTask';
import type { GridTask } from '../model/GridTask';

const colNum = 12;
const rowHeight = 30;

const DRAG_ITEM_INJECTION_KEY: InjectionKey<DragItemContext> =
  Symbol('drag-item');

export const useDragItem = (
  currentContentRef: Ref<HTMLElement | null>,
  currentGridLayoutRef: Ref<InstanceType<typeof GridLayout> | null>,
) => {
  const mouseXY = ref({ x: 0, y: 0 });
  const dragPos = ref<GridTask>({ x: 0, y: 0, w: 2, h: 3, i: '0' });
  const contentRef = currentContentRef;
  const gridLayoutRef = currentGridLayoutRef;
  const editorTasks = ref<EditorTask[]>([]);

  const layout = computed<GridTask[]>({
    get() {
      return editorTasks.value.map((task) => task.grid);
    },
    set(gridTasks) {
      const itemsById = _.keyBy(editorTasks.value, (item) => item.grid.i);
      const next: EditorTask[] = [];
      gridTasks.forEach((grid) => {
        const editorTask = itemsById[grid.i];
        if (editorTask) {
          editorTask.grid = grid;
          next.push(editorTask);
        } else {
          const editorTask = new EditorTask();
          editorTask.grid = grid;
          next.push(editorTask);
        }
      });
      editorTasks.value = next;
    },
  });

  const counter = ref(0);

  const updateDragElement = (e: DragEvent) => {
    console.log('called updateDragElement');
    e.preventDefault();
    mouseXY.value = { x: e.clientX, y: e.clientY };

    if (!contentRef.value) return;
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

    const index = layout.value.findIndex((item) => item.i === 'drop');
    if (index === -1) {
      // ドラッグ用のアイテムがないとき
      layout.value.push({
        x: pos.x,
        y: pos.y,
        w: 2,
        h: 3,
        i: 'drop',
      });
    } else {
      // ドラッグ用のアイテムがあったら
      if (mouseInGrid) {
        layout.value[index].x = pos.x;
        layout.value[index].y = pos.y;
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
    console.log('called handleDrop');
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
      layout.value = [
        ...layout.value.filter((obj) => obj.i !== 'drop'),
        {
          x: pos.x,
          y: pos.y,
          w: 2,
          h: 3,
          i: String(counter.value++),
        } as GridTask,
      ];
    }
  };

  const context = {
    mouseXY: readonly(mouseXY),
    dragPos: readonly(dragPos),
    counter: readonly(counter),
    editorTasks,
    layout,
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
    editorTasks: ref<EditorTask[]>([]),
    layout: ref<GridTask[]>([]),
    colNum: 1,
    rowHeight: 1,
    updateDragElement: (_e: DragEvent) => {},
    handleDrop: (_e: DragEvent) => {},
  });
};

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
    Math.min(Math.floor(offsetX / (parentRect.width / colNum)), colNum - 1),
  );

  const y = Math.max(0, Math.min(Math.floor(offsetY / 40), rowHeight - 1));

  return { x, y };
};
