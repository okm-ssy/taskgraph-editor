import * as _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EditorTask } from '../model/EditorTask';
import type { GridTask } from '../model/GridTask';

export const useCurrentTasks = defineStore('editorTask', () => {
  const editorTasks = ref<EditorTask[]>([]);
  const layoutRef = ref<GridTask[]>([]);

  const layout = computed({
    get: () => layoutRef.value,
    set(gridTasks: GridTask[]) {
      const itemsById = _.keyBy(
        editorTasks.value,
        (item: EditorTask) => item.grid.i,
      );
      const next: EditorTask[] = [];

      gridTasks.forEach((grid) => {
        const editorTask = itemsById[grid.i];
        if (editorTask) {
          // 既存のEditorTaskのgridプロパティを更新
          const updatedTask = new EditorTask();
          Object.assign(updatedTask, editorTask);
          updatedTask.grid = { ...grid };
          next.push(updatedTask);
        } else {
          // 新しいEditorTaskを作成
          const newTask = new EditorTask();
          newTask.grid = { ...grid };
          next.push(newTask);
        }
      });

      editorTasks.value = next;
      layoutRef.value = gridTasks;
    },
  });

  // Actions
  function addTask(task: EditorTask) {
    editorTasks.value = [...editorTasks.value, task];
    layoutRef.value = editorTasks.value.map((task) => task.grid);
  }

  function removeTask(taskId: string) {
    editorTasks.value = editorTasks.value.filter(
      (task) => task.grid.i !== taskId,
    );
    layoutRef.value = editorTasks.value.map((task) => task.grid);
  }

  function updateLayout(newLayout: GridTask[]) {
    layout.value = newLayout;
  }

  return {
    editorTasks,
    layout,
    addTask,
    removeTask,
    updateLayout,
  };
});
