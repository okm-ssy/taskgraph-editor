import * as _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EditorTask } from '../model/EditorTask';
import type { GridTask } from '../model/GridTask';
import {
  taskgraphZodSchema,
  type Taskgraph,
  type Task,
} from '../model/Taskgraph';

// サンプルタスクグラフデータ
const sampleTaskgraphData = {
  info: {},
  tasks: [
    {
      name: 'root-task',
      description: 'ルートタスク',
      difficulty: 1,
      depends: [''],
      notes: [''],
    },
    {
      name: 'sub-task-1',
      description: 'サブタスク1',
      difficulty: 2,
      depends: ['root-task'],
      notes: [''],
    },
    {
      name: 'sub-task-2',
      description: 'サブタスク2',
      difficulty: 3,
      depends: ['root-task'],
      notes: [''],
    },
    {
      name: 'leaf-task',
      description: 'リーフタスク',
      difficulty: 4,
      depends: ['sub-task-1', 'sub-task-2'],
      notes: [''],
    },
  ],
};

export const useCurrentTasks = defineStore('editorTask', () => {
  // Store
  const editorTasks = ref<EditorTask[]>([]);
  const info = ref<Taskgraph['info']>({});
  const taskLoadError = ref<string | null>(null);

  // Getters
  const tasks = computed(() => editorTasks.value.map((et) => et.task));
  const gridTasks = computed(() => editorTasks.value.map((et) => et.grid));
  const getTaskById = computed(
    () => (id: string) => editorTasks.value.find((et) => et.id === id),
  );
  const getDependentTasks = computed(
    () => (taskName: string) =>
      tasks.value.filter((task) => task.depends.includes(taskName)),
  );

  // Actions
  const addTask = () => {
    const newTask = new EditorTask();
    editorTasks.value.push(newTask);
    return newTask;
  };

  const removeTask = (id: string) => {
    const index = editorTasks.value.findIndex((et) => et.id === id);
    if (index !== -1) {
      editorTasks.value.splice(index, 1);
      return true;
    }
    return false;
  };

  const updateGridTask = (id: string, gridTask: Partial<GridTask>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      Object.assign(task.grid, gridTask);
      return true;
    }
    return false;
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      Object.assign(task.task, taskData);
      return true;
    }
    return false;
  };

  const parseJsonToTaskgraph = (jsonString: string) => {
    taskLoadError.value = null;

    try {
      // JSONパース
      const parsedData = JSON.parse(jsonString);

      // zodによるバリデーション
      const validationResult = taskgraphZodSchema.safeParse(parsedData);

      if (!validationResult.success) {
        const formattedError = validationResult.error.format();
        taskLoadError.value = `バリデーションエラー: ${JSON.stringify(formattedError)}`;
        return false;
      }

      // バリデーション成功時、データをストアに保存
      const taskgraph = validationResult.data;

      // infoの更新
      info.value = taskgraph.info;

      // 既存タスクをクリア
      editorTasks.value = [];

      // 新しいEditorTaskを作成して追加
      taskgraph.tasks.forEach((task) => {
        const editorTask = new EditorTask();
        editorTask.task = { ...task };
        editorTasks.value.push(editorTask);
      });

      return true;
    } catch (error) {
      taskLoadError.value = `JSON解析エラー: ${(error as Error).message}`;
      return false;
    }
  };

  const exportTaskgraphToJson = () => {
    const taskgraph: Taskgraph = {
      info: info.value,
      tasks: tasks.value,
    };

    return JSON.stringify(taskgraph, null, 2);
  };

  // サンプルデータをロードする関数
  const loadSampleData = () => {
    return parseJsonToTaskgraph(JSON.stringify(sampleTaskgraphData));
  };

  return {
    // Store
    editorTasks,
    info,
    taskLoadError,

    // Getters
    tasks,
    gridTasks,
    getTaskById,
    getDependentTasks,

    // Actions
    addTask,
    removeTask,
    updateGridTask,
    updateTask,
    parseJsonToTaskgraph,
    exportTaskgraphToJson,
    loadSampleData,
  };
});
