import type { EditorTask } from '../model/EditorTask';

/**
 * タスクのdepthを計算するユーティリティ
 * 各タスクのdepthは、依存先タスクのdepthの最大値 + 1
 */
export const useDepthCalculator = () => {
  // 循環依存が検出されたタスク名のリスト
  const circularDependencies = new Set<string>();
  /**
   * すべてのタスクのdepthを再計算
   * DFSを使って愚直に計算
   */
  const calculateAllDepths = (tasks: EditorTask[]): string[] => {
    // タスク名からEditorTaskへのマップを作成
    const taskMap = new Map<string, EditorTask>();
    tasks.forEach((task) => {
      taskMap.set(task.task.name, task);
    });

    // メモ化用のキャッシュ
    const depthCache = new Map<string, number>();

    /**
     * 特定のタスクのdepthを計算（DFS + メモ化）
     */
    const calculateDepth = (
      taskName: string,
      visiting: Set<string> = new Set(),
    ): number => {
      // キャッシュにあればそれを返す
      if (depthCache.has(taskName)) {
        return depthCache.get(taskName)!;
      }

      const task = taskMap.get(taskName);
      if (!task) {
        return 0; // タスクが見つからない場合は0
      }

      // 循環依存チェック
      if (visiting.has(taskName)) {
        circularDependencies.add(taskName);
        return 0;
      }

      // 依存関係がない場合はdepth = 0
      if (!task.task.depends || task.task.depends.length === 0) {
        depthCache.set(taskName, 0);
        task.depth = 0;
        return 0;
      }

      // 訪問中マークを追加
      visiting.add(taskName);

      // 依存先タスクのdepthの最大値を計算
      let maxDepth = 0;
      for (const dependsOn of task.task.depends) {
        const depDepth = calculateDepth(dependsOn, visiting);
        maxDepth = Math.max(maxDepth, depDepth);
      }

      // 訪問中マークを削除
      visiting.delete(taskName);

      // このタスクのdepthは最大値 + 1
      const depth = maxDepth + 1;
      depthCache.set(taskName, depth);
      task.depth = depth;

      return depth;
    };

    // 循環依存リストをクリア
    circularDependencies.clear();

    // すべてのタスクのdepthを計算
    tasks.forEach((task) => {
      calculateDepth(task.task.name);
    });

    // 循環依存が検出された場合は警告を返す
    return Array.from(circularDependencies);
  };

  /**
   * 依存関係が変更されたときに呼び出す
   * 影響を受けるタスクのdepthを再計算
   */
  const updateDepthsOnDependencyChange = (
    tasks: EditorTask[],
    _changedTaskName: string,
  ): string[] => {
    // シンプルに全体を再計算
    // 最適化が必要な場合は、影響を受けるタスクのみを再計算するよう改善可能
    return calculateAllDepths(tasks);
  };

  /**
   * 新しいタスクが追加されたときに呼び出す
   */
  const calculateDepthForNewTask = (
    tasks: EditorTask[],
    newTask: EditorTask,
  ): void => {
    // タスク名からEditorTaskへのマップを作成
    const taskMap = new Map<string, EditorTask>();
    tasks.forEach((task) => {
      taskMap.set(task.task.name, task);
    });

    // 新しいタスクのdepthを計算
    if (!newTask.task.depends || newTask.task.depends.length === 0) {
      newTask.depth = 0;
    } else {
      let maxDepth = 0;
      for (const dependsOn of newTask.task.depends) {
        const dependTask = taskMap.get(dependsOn);
        if (dependTask) {
          maxDepth = Math.max(maxDepth, dependTask.depth);
        }
      }
      newTask.depth = maxDepth + 1;
    }
  };

  /**
   * タスクが削除されたときに呼び出す
   * 削除されたタスクに依存していたタスクのdepthを再計算
   */
  const updateDepthsOnTaskDelete = (
    tasks: EditorTask[],
    deletedTaskName: string,
  ): void => {
    // 削除されたタスクに依存していたタスクを見つけて、depthを再計算
    const affectedTasks = tasks.filter((task) =>
      task.task.depends?.includes(deletedTaskName),
    );

    if (affectedTasks.length > 0) {
      // 影響を受けるタスクがある場合は全体を再計算
      calculateAllDepths(tasks);
    }
  };

  /**
   * 循環依存をチェック（特定タスクに新しい依存を追加する前に使用）
   */
  const checkCircularDependency = (
    tasks: EditorTask[],
    fromTaskName: string,
    toTaskName: string,
  ): boolean => {
    // タスク名からEditorTaskへのマップを作成
    const taskMap = new Map<string, EditorTask>();
    tasks.forEach((task) => {
      taskMap.set(task.task.name, task);
    });

    // toTaskからfromTaskへのパスが存在するかチェック（DFS）
    const canReach = (
      current: string,
      target: string,
      visited: Set<string> = new Set(),
    ): boolean => {
      if (current === target) return true;
      if (visited.has(current)) return false;

      visited.add(current);
      const currentTask = taskMap.get(current);
      if (!currentTask || !currentTask.task.depends) return false;

      for (const dep of currentTask.task.depends) {
        if (canReach(dep, target, visited)) {
          return true;
        }
      }
      return false;
    };

    // toTaskからfromTaskに到達できる場合は循環依存
    return canReach(toTaskName, fromTaskName);
  };

  return {
    calculateAllDepths,
    updateDepthsOnDependencyChange,
    calculateDepthForNewTask,
    updateDepthsOnTaskDelete,
    checkCircularDependency,
  };
};
