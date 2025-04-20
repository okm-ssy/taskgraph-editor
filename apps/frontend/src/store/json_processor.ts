import { ref } from 'vue';

import sampleTaskgraphData from '../assets/sample.taskgraph.json';
import { EditorTask } from '../model/EditorTask';
import { taskgraphZodSchema, type Taskgraph } from '../model/Taskgraph';

export const useJsonProcessor = () => {
  const taskLoadError = ref<string | null>(null);
  const jsonInputVisible = ref(false);

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

      // zodによるバリデーション
      const validationResult = taskgraphZodSchema.safeParse(parsedData);

      if (!validationResult.success) {
        const formattedError = validationResult.error.format();
        taskLoadError.value = `バリデーションエラー: ${JSON.stringify(formattedError)}`;
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
      taskLoadError.value = `JSON解析エラー: ${(error as Error).message}`;
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
      taskLoadError.value = `サンプルデータ読み込みエラー: ${(error as Error).message}`;
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
