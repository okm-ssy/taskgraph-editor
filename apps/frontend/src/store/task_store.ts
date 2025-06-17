// store/task_store.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useCriticalPath } from '../composables/useCriticalPath';
import { EditorTask } from '../model/EditorTask'; // EditorTask をインポート
import type { GridTask } from '../model/GridTask';
import type { Taskgraph, Task } from '../model/Taskgraph';

import { useEditorUIStore } from './editor_ui_store';
import { useGraphLayout } from './graph_layout_store';
import { useJsonProcessor } from './json_processor';

// ローカルファイル保存用の定数
const LOCAL_STORAGE_FILE_NAME = 'taskgraph-local-data.json';

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

  // 各タスクの元の難易度合計（1.2倍する前）
  const baseTotalDifficulty = computed(() => {
    return tasks.value.reduce((sum, task) => sum + task.difficulty, 0);
  });

  // 全タスクの難易度合計（余剰工数1.2倍を含む）
  const totalDifficulty = computed(() => {
    return baseTotalDifficulty.value * 1.2;
  });

  // クリティカルパス計算
  const {
    criticalPath,
    projectDuration: baseDuration,
    criticalTaskNames,
    dependencyEdges,
  } = useCriticalPath(editorTasks);

  // プロジェクト所要時間（余剰工数1.2倍を含む）
  const projectDuration = computed(() => {
    return baseDuration.value * 1.2;
  });

  // Actions
  const addTask = () => {
    const newTask = new EditorTask();
    editorTasks.value.push(newTask);
    graphLayout.buildGraphData(editorTasks.value);
    saveToSessionStorage(); // Session Storageに保存
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
      saveToSessionStorage(); // Session Storageに保存
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
      saveToSessionStorage();
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

    Object.assign(task.task, taskData);
    graphLayout.buildGraphData(editorTasks.value);
    saveToSessionStorage();
    return true;
  };

  // Session Storageにデータを保存
  const saveToSessionStorage = () => {
    try {
      if (editorTasks.value.length === 0) {
        return;
      }
      const jsonData = exportTaskgraphToJson();
      sessionStorage.setItem('taskgraph-data', jsonData);
      // ローカルファイルにも保存
      saveToLocalFile(jsonData);
    } catch (error) {
      console.error('Session Storage保存エラー:', error);
    }
  };

  // ローカルファイルにデータを保存
  const saveToLocalFile = (jsonData: string) => {
    try {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = LOCAL_STORAGE_FILE_NAME;
      // 自動的にダウンロードフォルダに保存されないため、localStorageを使用
      localStorage.setItem('taskgraph-local-data', jsonData);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('ローカルファイル保存エラー:', error);
    }
  };

  // Session Storageからデータを読み込み
  const loadFromSessionStorage = () => {
    try {
      let jsonData = sessionStorage.getItem('taskgraph-data');
      // セッションストレージにない場合はローカルストレージから読み込み
      if (!jsonData) {
        jsonData = localStorage.getItem('taskgraph-local-data');
      }
      if (jsonData) {
        isLoadingFromStorage = true;
        const result = parseJsonToTaskgraph(jsonData);
        isLoadingFromStorage = false;
        return result;
      }
    } catch (error) {
      console.error('Session Storage読み込みエラー:', error);
      isLoadingFromStorage = false;
    }
    return false;
  };

  // ストア初期化
  const initializeStore = () => {
    if (!isInitialized.value) {
      loadFromSessionStorage();
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
      saveToSessionStorage();
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

    // Critical Path
    criticalPath,
    projectDuration,
    criticalTaskNames,
    dependencyEdges,

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
    autoLayoutTasks,
    selectTask, // UIストアに委譲
    saveToSessionStorage,
    saveToLocalFile,
    loadFromSessionStorage,
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
