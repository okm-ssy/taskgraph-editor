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

  const updateGridTask = (id: string, gridTask: Partial<GridTask>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      Object.assign(task.grid, gridTask);
      saveToSessionStorage(); // Session Storageに保存
      return true;
    }
    return false;
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      // タスク名が変更された場合、依存しているタスクの depends を更新
      if (taskData.name && taskData.name !== task.task.name) {
        const oldName = task.task.name;
        const newName = taskData.name;

        // このタスクに依存している全てのタスクの depends を更新
        editorTasks.value.forEach((et) => {
          const dependsIndex = et.task.depends.indexOf(oldName);
          if (dependsIndex !== -1) {
            et.task.depends[dependsIndex] = newName;
          }
        });
      }

      Object.assign(task.task, taskData);
      graphLayout.buildGraphData(editorTasks.value); // 依存関係が変わる可能性があるのでグラフ再構築
      saveToSessionStorage(); // Session Storageに保存
      return true;
    }
    return false;
  };

  // Session Storageにデータを保存
  const saveToSessionStorage = () => {
    try {
      // タスクが0件の場合は保存しない（初期状態と区別するため）
      if (editorTasks.value.length === 0) {
        return;
      }
      const jsonData = exportTaskgraphToJson();
      sessionStorage.setItem('taskgraph-data', jsonData);
      console.log(
        'Session Storageに保存しました:',
        editorTasks.value.length,
        'タスク',
      );
    } catch (error) {
      console.error('Session Storage保存エラー:', error);
    }
  };

  // Session Storageからデータを読み込み
  const loadFromSessionStorage = () => {
    try {
      const jsonData = sessionStorage.getItem('taskgraph-data');
      if (jsonData) {
        console.log('Session Storageから読み込み中...');
        isLoadingFromStorage = true;
        const result = parseJsonToTaskgraph(jsonData);
        isLoadingFromStorage = false;
        console.log(
          'Session Storageから読み込み完了:',
          editorTasks.value.length,
          'タスク',
        );
        return result;
      } else {
        console.log('Session Storageにデータがありません');
      }
    } catch (error) {
      console.error('Session Storage読み込みエラー:', error);
      isLoadingFromStorage = false;
    }
    return false;
  };

  // ストア初期化時にSession Storageから読み込み
  const initializeStore = () => {
    if (!isInitialized.value) {
      console.log('ストアを初期化中...');
      loadFromSessionStorage();
      isInitialized.value = true;
    }
  };

  // ストア初期化を即座に実行
  initializeStore();

  // Session Storageからの読み込み中かどうかを管理
  let isLoadingFromStorage = false;

  // 既存タスクを新しいデータで更新 (JSONインポートなどで使用)
  const updateTasks = (newTasks: EditorTask[], newInfo: Taskgraph['info']) => {
    info.value = newInfo;
    editorTasks.value = newTasks;

    // JSONインポート時は自動配置を適用
    autoLayoutTasks();

    uiStore.closeDetailDialog(); // インポートしたら選択状態をリセット
    uiStore.clearSelection();

    // Session Storageからの読み込み中でない場合のみ保存
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
    return jsonProcessor.exportTaskgraphToJson(tasks.value, info.value);
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

  return {
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
    getDifficultyColor: graphLayout.getDifficultyColor,
    GRAPH_SETTINGS: graphLayout.GRAPH_SETTINGS,
  };
});
