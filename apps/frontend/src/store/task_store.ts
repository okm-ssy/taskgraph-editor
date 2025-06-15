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

  // 全タスクの難易度合計（余剰工数1.2倍を含む）
  const totalDifficulty = computed(() => {
    const baseDifficulty = tasks.value.reduce(
      (sum, task) => sum + task.difficulty,
      0,
    );
    return baseDifficulty * 1.2;
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
    return newTask;
  };

  const removeTask = (id: string) => {
    const index = editorTasks.value.findIndex((et) => et.id === id);
    if (index !== -1) {
      editorTasks.value.splice(index, 1);
      graphLayout.buildGraphData(editorTasks.value);
      // 削除されたタスクが選択中だったらダイアログを閉じる
      if (uiStore.selectedTaskId === id) {
        uiStore.closeDetailDialog();
        uiStore.clearSelection();
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

    // JSONインポート時は自動配置を適用
    autoLayoutTasks();

    uiStore.closeDetailDialog(); // インポートしたら選択状態をリセット
    uiStore.clearSelection();
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
