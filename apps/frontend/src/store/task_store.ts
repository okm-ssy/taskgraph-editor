import * as _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EditorTask } from '../model/EditorTask';
import type { GridTask } from '../model/GridTask';
import type { Taskgraph, Task } from '../model/Taskgraph';

import { useGraphLayout } from './graph_layout_store';
import { useJsonProcessor } from './json_processor';

export const useCurrentTasks = defineStore('editorTask', () => {
  // グラフレイアウト機能を取得
  const graphLayout = useGraphLayout();

  // JSON処理機能を取得
  const jsonProcessor = useJsonProcessor();

  // Store
  const editorTasks = ref<EditorTask[]>([]);
  const info = ref<Taskgraph['info']>({});

  // Getters
  const tasks = computed(() => editorTasks.value.map((et) => et.task));
  const gridTasks = computed(() => editorTasks.value.map((et) => et.grid));
  const taskCount = computed(() => editorTasks.value.length);
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
    graphLayout.buildGraphData(editorTasks.value);
    return newTask;
  };

  const removeTask = (id: string) => {
    const index = editorTasks.value.findIndex((et) => et.id === id);
    if (index !== -1) {
      editorTasks.value.splice(index, 1);
      graphLayout.buildGraphData(editorTasks.value);
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
      graphLayout.buildGraphData(editorTasks.value);
      return true;
    }
    return false;
  };

  // タスクを更新する関数（JSON処理から呼び出される）
  const updateTasks = (newTasks: EditorTask[], newInfo: Taskgraph['info']) => {
    info.value = newInfo;
    editorTasks.value = newTasks;
    graphLayout.buildGraphData(editorTasks.value);
  };

  // JSON処理メソッドのラッパー
  const parseJsonString = (jsonString: string) => {
    return jsonProcessor.parseJsonString(jsonString, updateTasks);
  };

  const parseJsonToTaskgraph = (jsonString: string) => {
    return jsonProcessor.parseJsonString(jsonString, updateTasks);
  };

  const exportTaskgraphToJson = () => {
    return jsonProcessor.exportTaskgraphToJson(tasks.value, info.value);
  };

  const loadSampleData = () => {
    return jsonProcessor.loadSampleData(updateTasks);
  };

  // グラフデータの構築
  const buildGraphData = () => {
    graphLayout.buildGraphData(editorTasks.value);
  };

  return {
    // Store
    editorTasks,
    info,

    // Getters
    tasks,
    gridTasks,
    taskCount,
    getTaskById,
    getDependentTasks,

    // Actions
    addTask,
    removeTask,
    updateGridTask,
    updateTask,
    parseJsonString,
    parseJsonToTaskgraph,
    exportTaskgraphToJson,
    loadSampleData,
    buildGraphData,

    // JSONProcessor
    taskLoadError: jsonProcessor.taskLoadError,
    jsonInputVisible: jsonProcessor.jsonInputVisible,
    toggleJsonInputVisibility: jsonProcessor.toggleJsonInputVisibility,

    // GraphLayout
    graphNodes: graphLayout.graphNodes,
    canvasWidth: graphLayout.canvasWidth,
    canvasHeight: graphLayout.canvasHeight,
    graphPaths: graphLayout.graphPaths,
    getPathD: graphLayout.getPathD,
    getDifficultyColor: graphLayout.getDifficultyColor,
    GRAPH_SETTINGS: graphLayout.GRAPH_SETTINGS,
  };
});
