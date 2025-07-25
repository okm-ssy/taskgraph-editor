// store/task_store.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { EditorTask } from '../model/EditorTask'; // EditorTask をインポート
import type { GridTask } from '../model/GridTask';
import type { Taskgraph, Task } from '../model/Taskgraph';

import { useEditorUIStore } from './editor_ui_store';
import { useGraphLayout } from './graph_layout_store';
import { useJsonProcessor } from './json_processor';

import { PROJECT_CONSTANTS } from '@/constants';

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

  // ファイル変更検知用
  const lastMtime = ref<string | null>(null);
  const pollingInterval = ref<number | null>(null);

  // Session Storage管理
  let isLoadingFromStorage = false;
  let isSaving = false; // 保存中フラグ

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
      (sum, task) => sum + (task.addition?.baseDifficulty || 0),
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
    saveToFile(); // ファイルに保存
    return newTask;
  };

  // 指定位置にタスクを追加
  const addTaskAtPosition = (x: number, y: number) => {
    const newTask = new EditorTask();
    // グリッド位置を設定
    newTask.grid.x = x;
    newTask.grid.y = y;
    // レイアウト位置も設定
    if (!newTask.task.addition) {
      newTask.task.addition = {
        baseDifficulty: 0,
        relations: [],
        category: '',
      };
    }
    newTask.task.addition.layout = { x, y };
    editorTasks.value.push(newTask);
    graphLayout.buildGraphData(editorTasks.value);
    saveToFile(); // ファイルに保存
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
      saveToFile(); // ファイルに保存
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
      if (!task.task.addition) {
        task.task.addition = { baseDifficulty: 0, relations: [], category: '' };
      }
      if (!task.task.addition.layout) {
        task.task.addition.layout = { x: 0, y: 0 };
      }
      if (gridTask.x !== undefined) {
        task.task.addition.layout.x = gridTask.x;
      }
      if (gridTask.y !== undefined) {
        task.task.addition.layout.y = gridTask.y;
      }
    }
  };

  const updateGridTask = (id: string, gridTask: Partial<GridTask>) => {
    const task = editorTasks.value.find((et) => et.id === id);
    if (task) {
      Object.assign(task.grid, gridTask);
      syncLayoutInfo(task, gridTask);
      saveToFile();
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
    if (taskData.addition?.baseDifficulty !== undefined) {
      taskData.difficulty =
        Math.round(taskData.addition.baseDifficulty * 1.2 * 10) / 10;
    }

    Object.assign(task.task, taskData);
    graphLayout.buildGraphData(editorTasks.value);
    saveToFile();
    return true;
  };

  // 現在のプロジェクトIDを取得
  const getCurrentProjectId = (): string => {
    return (
      localStorage.getItem(PROJECT_CONSTANTS.STORAGE_KEY) ||
      PROJECT_CONSTANTS.DEFAULT_PROJECT_ID
    );
  };

  // ファイルにデータを保存（デバウンス付き）
  let saveTimeout: NodeJS.Timeout | null = null;
  const saveToFile = async () => {
    // デバウンス: 1秒以内の連続呼び出しをまとめる
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
      try {
        if (editorTasks.value.length === 0) {
          return;
        }

        isSaving = true; // 保存開始
        const jsonData = exportTaskgraphToJson();
        const projectId = getCurrentProjectId();

        const url = `/api/save-taskgraph?projectId=${encodeURIComponent(projectId)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonData,
        });
        if (!response.ok) {
          throw new Error('Failed to save taskgraph');
        }

        // 保存成功後にmtimeを更新
        const newMtime = await checkFileMtime(projectId);
        if (newMtime) {
          lastMtime.value = newMtime;
        }
      } catch (error) {
        console.error('ファイル保存エラー:', error);
      } finally {
        isSaving = false; // 保存終了
      }
    }, 1000); // 1秒のデバウンス
  };

  // ファイルの最終更新時刻を取得
  const checkFileMtime = async (projectId?: string): Promise<string | null> => {
    try {
      const url = projectId
        ? `/api/taskgraph-mtime?projectId=${encodeURIComponent(projectId)}`
        : '/api/taskgraph-mtime';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to check file mtime');
      }
      const data = await response.json();
      return data.exists ? data.mtime : null;
    } catch (error) {
      console.error('ファイル更新時刻チェックエラー:', error);
      return null;
    }
  };

  // ファイルからデータを取得
  const getFromFile = async (projectId?: string): Promise<string | null> => {
    try {
      const url = projectId
        ? `/api/load-taskgraph?projectId=${encodeURIComponent(projectId)}`
        : '/api/load-taskgraph';
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // ファイルが存在しない場合
        }
        throw new Error('Failed to load taskgraph');
      }
      return await response.text();
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      return null;
    }
  };

  // ファイルからデータを読み込み
  const loadFromFile = async () => {
    try {
      const projectId = getCurrentProjectId();
      const jsonData = await getFromFile(projectId);
      if (jsonData) {
        isLoadingFromStorage = true;
        const result = parseJsonToTaskgraph(jsonData);
        isLoadingFromStorage = false;

        // 最終更新時刻を更新
        const mtime = await checkFileMtime(projectId);
        if (mtime) {
          lastMtime.value = mtime;
        }

        return result;
      }
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      isLoadingFromStorage = false;
    }
    return false;
  };

  // ストア初期化
  const initializeStore = async () => {
    if (!isInitialized.value) {
      await loadFromFile();

      // 初期化時に最終更新時刻を設定
      const projectId = getCurrentProjectId();
      const mtime = await checkFileMtime(projectId);
      if (mtime) {
        lastMtime.value = mtime;
      }

      isInitialized.value = true;
      startPolling(); // ポーリング開始

      // ウィンドウフォーカス時にもチェック
      window.addEventListener('focus', async () => {
        if (!isSaving) {
          const projectId = getCurrentProjectId();
          const currentMtime = await checkFileMtime(projectId);
          if (
            currentMtime &&
            lastMtime.value &&
            currentMtime !== lastMtime.value
          ) {
            console.log('ウィンドウフォーカス時にファイル変更を検知しました');
            await loadFromFile();
          }
        }
      });

      // ページ表示状態変更時にもチェック（タブ切り替え等）
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && !isSaving) {
          const projectId = getCurrentProjectId();
          const currentMtime = await checkFileMtime(projectId);
          if (
            currentMtime &&
            lastMtime.value &&
            currentMtime !== lastMtime.value
          ) {
            console.log('タブ復帰時にファイル変更を検知しました');
            await loadFromFile();
          }
        }
      });

      // クリップボード操作後の遅延チェック（貼り付け後のファイル変更検知）
      let pasteCheckTimeout: NodeJS.Timeout | null = null;
      const handlePasteCheck = async () => {
        if (pasteCheckTimeout) clearTimeout(pasteCheckTimeout);
        pasteCheckTimeout = setTimeout(async () => {
          if (!isSaving) {
            const projectId = getCurrentProjectId();
            const currentMtime = await checkFileMtime(projectId);
            if (
              currentMtime &&
              lastMtime.value &&
              currentMtime !== lastMtime.value
            ) {
              console.log('貼り付け操作後にファイル変更を検知しました');
              await loadFromFile();
            }
          }
        }, 500); // 貼り付け後0.5秒で確認
      };

      // キーボード操作での貼り付け検知
      document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          handlePasteCheck();
        }
      });

      // コンテキストメニューでの貼り付け検知（難しいので focus イベントで代用）
      window.addEventListener('focus', handlePasteCheck);
    }
  };

  // ファイル変更のポーリング開始
  const startPolling = () => {
    // 既存のポーリングを停止
    stopPolling();

    // 2秒ごとに変更をチェック
    pollingInterval.value = window.setInterval(async () => {
      // 保存中は外部変更チェックをスキップ
      if (isSaving) {
        return;
      }

      const projectId = getCurrentProjectId();
      const currentMtime = await checkFileMtime(projectId);

      if (currentMtime && lastMtime.value && currentMtime !== lastMtime.value) {
        console.log(
          `ファイルが外部で変更されました。リロードします... (${lastMtime.value} -> ${currentMtime})`,
        );
        // 保留中の自動保存をキャンセルしてレースコンディションを防ぐ
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveTimeout = null;
          console.log('保留中の自動保存をキャンセルしました');
        }
        await loadFromFile();
      }

      if (currentMtime) {
        lastMtime.value = currentMtime;
      }
    }, 1000); // 1秒に変更
  };

  // ポーリング停止
  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
  };

  // layout情報が存在するかチェック
  const hasValidLayoutInfo = (tasks: EditorTask[]): boolean => {
    return tasks.some(
      (task) =>
        task.task.addition?.layout &&
        (task.task.addition.layout.x !== 0 ||
          task.task.addition.layout.y !== 0),
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
      saveToFile();
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
      addition: {
        baseDifficulty: editorTask.task.addition?.baseDifficulty || 0,
        relations: editorTask.task.addition?.relations || [],
        category: editorTask.task.addition?.category || '',
        layout: {
          x: editorTask.grid.x,
          y: editorTask.grid.y,
        },
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
    saveToFile,
    loadFromFile,
    initializeStore,
    stopPolling,

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
  // 非同期なので直接awaitはできないが、バックグラウンドで実行
  initializeStore().catch(console.error);

  return storeResult;
});
