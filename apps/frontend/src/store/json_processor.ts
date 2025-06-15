import { ref } from 'vue';

import sampleTaskgraphData from '../assets/sample.taskgraph.json';
import { EditorTask } from '../model/EditorTask';
import { validateTaskgraph, type Taskgraph } from '../model/Taskgraph';

import { useErrorStore } from './error_store';

export const useJsonProcessor = () => {
  const taskLoadError = ref<string | null>(null);
  const jsonInputVisible = ref(false);
  const errorStore = useErrorStore();

  // JSON文字列のパース
  const parseJsonString = (
    jsonString: string,
    updateTasks: (tasks: EditorTask[], info: Taskgraph['info']) => void,
  ) => {
    taskLoadError.value = null;

    if (!jsonString.trim()) {
      taskLoadError.value = 'JSONテキストを入力してください';
      return false;
    }

    try {
      // JSONパース
      const parsedData = JSON.parse(jsonString);

      // バリデーション（循環依存チェック付き）
      const validationResult = validateTaskgraph(parsedData);

      if (!validationResult.success) {
        const errorMessage = 'バリデーションエラーが発生しました';
        taskLoadError.value = errorMessage;
        errorStore.addValidationError(errorMessage, validationResult.error);
        return false;
      }

      // 循環依存のチェック
      if (validationResult.hasCycles) {
        const cycleMessage = `循環依存が検出されました: ${validationResult.cycles.map((cycle) => cycle.join(' -> ')).join(', ')}`;
        taskLoadError.value = cycleMessage;
        errorStore.addValidationError(cycleMessage, validationResult.cycles);
        return false;
      }

      // バリデーション成功時、データを返す
      const taskgraph = validationResult.data;

      // 新しいEditorTaskを作成
      const newEditorTasks: EditorTask[] = [];
      taskgraph.tasks.forEach((task) => {
        const editorTask = new EditorTask();
        editorTask.task = { ...task };
        newEditorTasks.push(editorTask);
      });

      // 更新関数を呼び出し
      updateTasks(newEditorTasks, taskgraph.info);

      return true;
    } catch (error) {
      const errorMessage = `JSON解析エラー: ${(error as Error).message}`;
      taskLoadError.value = errorMessage;
      errorStore.addValidationError(errorMessage, error);
      return false;
    }
  };

  // タスクグラフをJSONに変換
  const exportTaskgraphToJson = (
    tasks: Taskgraph['tasks'],
    info: Taskgraph['info'],
  ) => {
    const taskgraph: Taskgraph = {
      info: info,
      tasks: tasks,
    };

    return JSON.stringify(taskgraph, null, 2);
  };

  // サンプルデータをロード
  const loadSampleData = (
    updateTasks: (tasks: EditorTask[], info: Taskgraph['info']) => void,
  ) => {
    try {
      // importしたJSONファイルを直接使用
      return parseJsonString(JSON.stringify(sampleTaskgraphData), updateTasks);
    } catch (error) {
      const errorMessage = `サンプルデータ読み込みエラー: ${(error as Error).message}`;
      taskLoadError.value = errorMessage;
      errorStore.addSystemError(errorMessage, error);
      return false;
    }
  };

  // JSON入力パネルの表示/非表示を切り替える
  const toggleJsonInputVisibility = () => {
    jsonInputVisible.value = !jsonInputVisible.value;
  };

  return {
    taskLoadError,
    jsonInputVisible,
    parseJsonString,
    exportTaskgraphToJson,
    loadSampleData,
    toggleJsonInputVisibility,
  };
};
