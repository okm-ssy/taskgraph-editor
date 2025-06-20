// store/task_store.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORAGE_KEYS, STORAGE_EXPIRY } from '../constants';
import { EditorTask } from '../model/EditorTask'; // EditorTask をインポート
import type { GridTask } from '../model/GridTask';
import type { Taskgraph, Task } from '../model/Taskgraph';

import { useEditorUIStore } from './editor_ui_store';
import { useGraphLayout } from './graph_layout_store';
import { useJsonProcessor } from './json_processor';

export const useCurrentTasks = defineStore('editorTask', () => {
  // グラフレイアウト関連
  const graphLayout = useGraphLayout();

  // JSON処理関連
  const jsonProcessor = useJsonProcessor();

  // UIストア
  const uiStore = useEditorUIStore();

  // Store State
  const editorTasks = ref<EditorTask[]>([]);
  const info = ref<Taskgraph['info']>({});

  // ストア初期化フラグ
  const isInitialized = ref(false);

  // Session Storage管理
  let isLoadingFromStorage = false;

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
  // 選択中のタスクオブジェクトを取得（UIストアから）
  const selectedTask = computed((): EditorTask | null => {
    if (!uiStore.selectedTaskId) return null;
    return getTaskById.value(uiStore.selectedTaskId) ?? null;
  });

  // 各タスクのベース難易度合計（1.2倍する前）
  const baseTotalDifficulty = computed(() => {
    return tasks.value.reduce(
      (sum, task) => sum + (task.baseDifficulty || 0),
      0,
    );
  });

  // 全タスクの難易度合計（各タスクで既に1.2倍されているのでそのまま合計）
  const totalDifficulty = computed(() => {
    return tasks.value.reduce((sum, task) => sum + task.difficulty, 0);
  });

  // Actions
  const addTask = () => {
    const newTask = new EditorTask();
    editorTasks.value.push(newTask);
    graphLayout.buildGraphData(editorTasks.value);
    saveToLocalStorage(); // LocalStorageに保存
    return newTask;
  };

  // 指定位置にタスクを追加
  const addTaskAtPosition = (x: number, y: number) => {
    const newTask = new EditorTask();
    // グリッド位置を設定
    newTask.grid.x = x;
    newTask.grid.y = y;
    // レイアウト位置も設定
    newTask.task.layout = { x, y };
    editorTasks.value.push(newTask);
    graphLayout.buildGraphData(editorTasks.value);
    saveToLocalStorage(); // LocalStorageに保存
    return newTask;
  };

  const removeTask = (id: string) => {
    const index = editorTasks.value.findIndex((et) => et.id === id);
    if (index !== -1) {
      // 削除するタスクの名前を取得
      const removedTaskName = editorTasks.value[index].task.name;

      // このタスクに依存している全てのタスクの depends から削除
      editorTasks.value.forEach((et) => {
        const dependsIndex = et.task.depends.indexOf(removedTaskName);
        if (dependsIndex !== -1) {
          et.task.depends.splice(dependsIndex, 1);
        }
      });

      // タスクを削除
      editorTasks.value.splice(index, 1);
      graphLayout.buildGraphData(editorTasks.value);
      // 削除されたタスクが選択中だったらダイアログを閉じる
      if (uiStore.selectedTaskId === id) {
        uiStore.closeDetailDialog();
        uiStore.clearSelection();
      }
      saveToLocalStorage(); // LocalStorageに保存
      return true;
    }
    return false;
  };

  // Task内のlayout情報を同期
  const syncLayoutInfo = (
    task: EditorTask,
    gridTask: Partial<GridTask>,
  ): void => {
    if (gridTask.x !== undefined || gridTask.y !== undefined) {
      if (!task.task.layout) {
        task.task.layout = { x: 0, y: 0 };
      }
      if (gridTask.x !== undefined) {
        task.task.layout.x = gridTask.x;
      }
      if (gridTask.y !== undefined) {
        task.task.layout.y = gridTask.y;
      }
    }
  };

  const updateGridTask = (id: string, gridTask: Partial<GridTask>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      Object.assign(task.grid, gridTask);
      syncLayoutInfo(task, gridTask);
      saveToLocalStorage();
      return true;
    }
    return false;
  };

  // タスク名の重複をチェック
  const isTaskNameDuplicate = (id: string, newName: string): boolean => {
    return editorTasks.value.some(
      (et) => et.id !== id && et.task.name === newName,
    );
  };

  // タスク名変更時の依存関係を更新
  const updateTaskNameDependencies = (
    oldName: string,
    newName: string,
  ): void => {
    editorTasks.value.forEach((et) => {
      const dependsIndex = et.task.depends.indexOf(oldName);
      if (dependsIndex !== -1) {
        et.task.depends[dependsIndex] = newName;
      }
    });
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (!task) return false;

    // タスク名が変更された場合のバリデーションと更新
    if (taskData.name && taskData.name !== task.task.name) {
      if (isTaskNameDuplicate(id, taskData.name)) {
        return false;
      }
      updateTaskNameDependencies(task.task.name, taskData.name);
    }

    // baseDifficultyが更新された場合、difficultyを1.2倍で計算
    if (taskData.baseDifficulty !== undefined) {
      taskData.difficulty = Math.round(taskData.baseDifficulty * 1.2 * 10) / 10;
    }

    Object.assign(task.task, taskData);
    graphLayout.buildGraphData(editorTasks.value);
    saveToLocalStorage();
    return true;
  };

  // LocalStorageにデータを保存（期限付き）
  const saveToLocalStorage = () => {
    try {
      if (editorTasks.value.length === 0) {
        return;
      }
      const jsonData = exportTaskgraphToJson();
      const expiryTime = Date.now() + STORAGE_EXPIRY.TASKGRAPH_DATA_MS;
      localStorage.setItem(STORAGE_KEYS.TASKGRAPH_DATA, jsonData);
      localStorage.setItem(
        STORAGE_KEYS.TASKGRAPH_DATA_EXPIRY,
        expiryTime.toString(),
      );
    } catch (error) {
      console.error('LocalStorage保存エラー:', error);
    }
  };

  // LocalStorageから期限をチェックしてデータを取得
  const getFromLocalStorage = (): string | null => {
    try {
      const expiryTime = localStorage.getItem(
        STORAGE_KEYS.TASKGRAPH_DATA_EXPIRY,
      );
      if (!expiryTime) return null;

      const now = Date.now();
      const expiry = parseInt(expiryTime, 10);

      // 期限切れの場合は削除
      if (now > expiry) {
        localStorage.removeItem(STORAGE_KEYS.TASKGRAPH_DATA);
        localStorage.removeItem(STORAGE_KEYS.TASKGRAPH_DATA_EXPIRY);
        return null;
      }

      return localStorage.getItem(STORAGE_KEYS.TASKGRAPH_DATA);
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
      return null;
    }
  };

  // LocalStorageからデータを読み込み
  const loadFromLocalStorage = () => {
    try {
      const jsonData = getFromLocalStorage();
      if (jsonData) {
        isLoadingFromStorage = true;
        const result = parseJsonToTaskgraph(jsonData);
        isLoadingFromStorage = false;
        return result;
      }
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
      isLoadingFromStorage = false;
    }
    return false;
  };

  // ストア初期化
  const initializeStore = () => {
    if (!isInitialized.value) {
      loadFromLocalStorage();
      isInitialized.value = true;
    }
  };

  // layout情報が存在するかチェック
  const hasValidLayoutInfo = (tasks: EditorTask[]): boolean => {
    return tasks.some(
      (task) =>
        task.task.layout &&
        (task.task.layout.x !== 0 || task.task.layout.y !== 0),
    );
  };

  // 既存タスクを新しいデータで更新 (JSONインポートなどで使用)
  const updateTasks = (newTasks: EditorTask[], newInfo: Taskgraph['info']) => {
    info.value = newInfo;
    editorTasks.value = newTasks;

    // layout情報が存在する場合は自動配置をスキップ
    if (hasValidLayoutInfo(newTasks)) {
      buildGraphData();
    } else {
      autoLayoutTasks();
    }

    uiStore.closeDetailDialog();
    uiStore.clearSelection();

    if (!isLoadingFromStorage) {
      saveToLocalStorage();
    }
  };

  // JSON処理メソッドのラッパー
  const parseJsonString = (jsonString: string) => {
    return jsonProcessor.parseJsonString(jsonString, updateTasks);
  };

  const parseJsonToTaskgraph = (jsonString: string) => {
    return jsonProcessor.parseJsonString(jsonString, updateTasks);
  };

  const exportTaskgraphToJson = () => {
    // layout情報を含むタスクデータを作成
    const tasksWithLayout = editorTasks.value.map((editorTask) => ({
      ...editorTask.task,
      layout: {
        x: editorTask.grid.x,
        y: editorTask.grid.y,
      },
    }));

    return jsonProcessor.exportTaskgraphToJson(tasksWithLayout, info.value);
  };

  const loadSampleData = () => {
    return jsonProcessor.loadSampleData(updateTasks);
  };

  // グラフデータ構築
  const buildGraphData = () => {
    graphLayout.buildGraphData(editorTasks.value);
  };

  // グラフレイアウトベースの自動配置
  const autoLayoutTasks = () => {
    if (editorTasks.value.length === 0) return;

    // グラフレイアウトを使ってグリッド座標を計算
    const updatedTasks = graphLayout.convertGraphToGrid(editorTasks.value);

    // 重複を避けて最適化
    graphLayout.optimizeGridLayout(updatedTasks);

    // グラフデータも更新
    buildGraphData();

    return updatedTasks;
  };

  // タスク選択のアクション（UIストアに委譲）
  const selectTask = (id: string) => {
    uiStore.selectTask(id);
    uiStore.openDetailDialog();
  };

  const storeResult = {
    // Store State
    editorTasks,
    info,

    // Getters
    tasks,
    gridTasks,
    taskCount,
    baseTotalDifficulty,
    totalDifficulty,
    getTaskById,
    getDependentTasks,
    selectedTask, // 追加

    // Actions
    addTask,
    addTaskAtPosition,
    removeTask,
    updateGridTask,
    updateTask,
    parseJsonString,
    parseJsonToTaskgraph,
    exportTaskgraphToJson,
    loadSampleData,
    buildGraphData,
    autoLayoutTasks,
    selectTask, // UIストアに委譲
    saveToLocalStorage,
    loadFromLocalStorage,
    initializeStore,

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
    GRAPH_SETTINGS: graphLayout.GRAPH_SETTINGS,
  };

  // ストア初期化を実行（全ての関数定義後）
  initializeStore();

  return storeResult;
});
