// store/task_store.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EditorTask } from '../model/EditorTask'; // EditorTask をインポート
import type { GridTask } from '../model/GridTask';
import type { Taskgraph, Task } from '../model/Taskgraph';

import { useGraphLayout } from './graph_layout_store';
import { useJsonProcessor } from './json_processor';

export const useCurrentTasks = defineStore('editorTask', () => {
  // グラフレイアウト関連
  const graphLayout = useGraphLayout();

  // JSON処理関連
  const jsonProcessor = useJsonProcessor();

  // Store State
  const editorTasks = ref<EditorTask[]>([]);
  const info = ref<Taskgraph['info']>({});
  const selectedTaskId = ref<string | null>(null); // 追加: 選択中のタスクID
  const isDetailDialogVisible = ref(false); // 追加: 詳細ダイアログの表示状態

  // Getters
  const tasks = computed(() => editorTasks.value.map((et) => et.task));
  const gridTasks = computed(() => editorTasks.value.map((et) => et.grid));
  const taskCount = computed(() => editorTasks.value.length);
  const getTaskById = computed(
    () =>
      (id: string): EditorTask | undefined =>
        editorTasks.value.find((et) => et.id === id), // 型を明確化
  );
  const getDependentTasks = computed(
    () =>
      (
        taskName: string,
      ): Task[] => // 型を明確化
        tasks.value.filter((task) => task.depends.includes(taskName)),
  );
  // 追加: 選択中のタスクオブジェクトを取得
  const selectedTask = computed((): EditorTask | null => {
    if (!selectedTaskId.value) return null;
    return getTaskById.value(selectedTaskId.value) ?? null;
  });

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
      // 削除されたタスクが選択中だったらダイアログを閉じる
      if (selectedTaskId.value === id) {
        closeDetailDialog();
      }
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
      graphLayout.buildGraphData(editorTasks.value); // 依存関係が変わる可能性があるのでグラフ再構築
      return true;
    }
    return false;
  };

  // 既存タスクを新しいデータで更新 (JSONインポートなどで使用)
  const updateTasks = (newTasks: EditorTask[], newInfo: Taskgraph['info']) => {
    info.value = newInfo;
    editorTasks.value = newTasks;
    graphLayout.buildGraphData(editorTasks.value);
    closeDetailDialog(); // インポートしたら選択状態をリセット
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

  // グラフデータ構築
  const buildGraphData = () => {
    graphLayout.buildGraphData(editorTasks.value);
  };

  // --- 追加: ダイアログ関連のアクション ---
  const selectTask = (id: string) => {
    selectedTaskId.value = id;
    isDetailDialogVisible.value = true;
  };

  const closeDetailDialog = () => {
    isDetailDialogVisible.value = false;
    selectedTaskId.value = null; // 選択状態を解除
  };
  // --- ここまで追加 ---

  return {
    // Store State
    editorTasks,
    info,

    // Getters
    tasks,
    gridTasks,
    taskCount,
    getTaskById,
    getDependentTasks,
    selectedTask, // 追加

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
    selectTask, // 追加
    closeDetailDialog, // 追加

    // JSONProcessor State & Methods
    taskLoadError: jsonProcessor.taskLoadError,
    jsonInputVisible: jsonProcessor.jsonInputVisible,
    toggleJsonInputVisibility: jsonProcessor.toggleJsonInputVisibility,

    // GraphLayout State & Methods
    graphNodes: graphLayout.graphNodes,
    canvasWidth: graphLayout.canvasWidth,
    canvasHeight: graphLayout.canvasHeight,
    graphPaths: graphLayout.graphPaths,
    getPathD: graphLayout.getPathD,
    getDifficultyColor: graphLayout.getDifficultyColor,
    GRAPH_SETTINGS: graphLayout.GRAPH_SETTINGS,

    // 追加: ダイアログ表示状態
    isDetailDialogVisible,
  };
});
