import { InjectionKey, inject, provide } from 'vue';

import type { Task } from '../model/Taskgraph';
import { useEditorUIStore } from '../store/editor_ui_store';
import { useErrorStore } from '../store/error_store';
import { useCurrentTasks } from '../store/task_store';

export interface TaskActions {
  selectTask: (id: string) => void;
  deleteTask: (id: string) => boolean;
  addTask: () => void;
  addTaskAtPosition: (x: number, y: number) => void;
  updateTask: (id: string, data: Partial<Task>) => boolean;
  clearSelection: () => void;
  showError: (
    message: string,
    type?: 'validation' | 'network' | 'system' | 'user',
  ) => void;
}

// Injection Key
export const TaskActionsKey: InjectionKey<TaskActions> = Symbol('task-actions');

// Provider（親コンポーネントで使用）
export const useTaskActionsProvider = () => {
  const taskStore = useCurrentTasks();
  const uiStore = useEditorUIStore();
  const errorStore = useErrorStore();

  const taskActions: TaskActions = {
    selectTask: (id: string) => {
      taskStore.selectTask(id);
    },

    deleteTask: (id: string) => {
      const success = taskStore.removeTask(id);
      if (!success) {
        errorStore.addUserError('タスクの削除に失敗しました');
      }
      return success;
    },

    addTask: () => {
      try {
        taskStore.addTask();
      } catch (error) {
        errorStore.addSystemError('タスクの追加に失敗しました', error);
      }
    },

    addTaskAtPosition: (x: number, y: number) => {
      try {
        taskStore.addTaskAtPosition(x, y);
      } catch (error) {
        errorStore.addSystemError('タスクの追加に失敗しました', error);
      }
    },

    updateTask: (id: string, data: Partial<Task>) => {
      const success = taskStore.updateTask(id, data);
      if (!success) {
        errorStore.addUserError('タスクの更新に失敗しました');
      }
      return success;
    },

    clearSelection: () => {
      uiStore.clearSelection();
    },

    showError: (message: string, type = 'user' as const) => {
      errorStore.addError(message, type);
    },
  };

  provide(TaskActionsKey, taskActions);

  return taskActions;
};

// Consumer（子コンポーネントで使用）
export const useTaskActions = (): TaskActions => {
  const taskActions = inject(TaskActionsKey);

  if (!taskActions) {
    throw new Error(
      'useTaskActions must be used within a component that provides TaskActions',
    );
  }

  return taskActions;
};
