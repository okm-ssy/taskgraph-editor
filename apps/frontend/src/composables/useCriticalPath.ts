import { computed, ref, watchEffect } from 'vue';

import type { EditorTask } from '../model/EditorTask';
import { useErrorStore } from '../store/error_store';

// クリティカルパス上のタスクペア（依存関係）
export interface CriticalPathEdge {
  fromTaskId: string;
  toTaskId: string;
  weight: number;
}

// タスクノード情報
interface TaskNode {
  id: string;
  name: string;
  weight: number; // 難易度
  dependencies: string[]; // 依存タスク名
  dependents: string[]; // このタスクに依存するタスク名
  earliestStart: number;
  latestStart: number;
  earliestFinish: number;
  latestFinish: number;
  buffer: number; // 余裕時間
}

export const useCriticalPath = (editorTasks: EditorTask[]) => {
  const errorStore = useErrorStore();
  // トポロジカルソート（カーンのアルゴリズム）
  const topologicalSort = (nodeMap: Map<string, TaskNode>): string[] => {
    const result: string[] = [];
    const inDegree = new Map<string, number>();

    // 入次数を計算
    nodeMap.forEach((node, name) => {
      inDegree.set(name, node.dependencies.length);
    });

    // 入次数が0のノードをキューに追加
    const queue: string[] = [];
    inDegree.forEach((degree, name) => {
      if (degree === 0) {
        queue.push(name);
      }
    });

    // トポロジカルソート実行
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const currentNode = nodeMap.get(current);
      if (currentNode) {
        currentNode.dependents.forEach((dependentName) => {
          const currentInDegree = inDegree.get(dependentName)!;
          inDegree.set(dependentName, currentInDegree - 1);
          if (currentInDegree - 1 === 0) {
            queue.push(dependentName);
          }
        });
      }
    }

    // 循環依存のチェック
    if (result.length !== nodeMap.size) {
      const unprocessedNodes = Array.from(nodeMap.keys()).filter(
        (name) => !result.includes(name),
      );
      const errorMessage = `循環依存が検出されました。確認してください: ${unprocessedNodes.join(', ')}`;
      console.warn(errorMessage);

      // 循環依存の情報を返す
      return { result, hasCircularDependency: true, unprocessedNodes };
    }

    return { result, hasCircularDependency: false, unprocessedNodes: [] };
  };

  // タスクグラフの構築
  const buildTaskGraph = () => {
    const nodeMap = new Map<string, TaskNode>();

    // 全タスクのノードを作成
    editorTasks.forEach((editorTask) => {
      const task = editorTask.task;
      const cleanDependencies = task.depends.filter((dep) => dep !== '');

      nodeMap.set(task.name, {
        id: editorTask.id,
        name: task.name,
        weight: task.difficulty, // 難易度を重みとして使用
        dependencies: cleanDependencies,
        dependents: [],
        earliestStart: 0,
        latestStart: 0,
        earliestFinish: 0,
        latestFinish: 0,
        buffer: 0,
      });
    });

    // dependent関係を構築
    nodeMap.forEach((node) => {
      node.dependencies.forEach((depName) => {
        const depNode = nodeMap.get(depName);
        if (depNode) {
          depNode.dependents.push(node.name);
        }
      });
    });

    return nodeMap;
  };

  // 最早開始時刻の計算（フォワードパス）
  const calculateEarliestTimes = (nodeMap: Map<string, TaskNode>) => {
    const { result: sortedNodes } = topologicalSort(nodeMap);

    // トポロジカル順序で最早時刻を計算
    sortedNodes.forEach((nodeName) => {
      const node = nodeMap.get(nodeName);
      if (!node) return;

      // 依存タスクの最遅完了時刻を求める
      let maxDependencyFinish = 0;
      node.dependencies.forEach((depName) => {
        const depNode = nodeMap.get(depName);
        if (depNode) {
          maxDependencyFinish = Math.max(
            maxDependencyFinish,
            depNode.earliestFinish,
          );
        }
      });

      node.earliestStart = maxDependencyFinish;
      node.earliestFinish = node.earliestStart + node.weight;
    });
  };

  // 最遅開始時刻の計算（バックワードパス）
  const calculateLatestTimes = (nodeMap: Map<string, TaskNode>) => {
    // プロジェクト完了時刻を取得
    const projectFinishTime = Math.max(
      ...Array.from(nodeMap.values()).map((node) => node.earliestFinish),
    );

    // 終端ノード（dependentsが空）の最遅完了時刻を設定
    nodeMap.forEach((node) => {
      if (node.dependents.length === 0) {
        node.latestFinish = projectFinishTime;
      }
    });

    // トポロジカル順序の逆順で最遅時刻を計算
    const { result: sortedNodes } = topologicalSort(nodeMap);
    for (let i = sortedNodes.length - 1; i >= 0; i--) {
      const nodeName = sortedNodes[i];
      const node = nodeMap.get(nodeName);
      if (!node) continue;

      // 終端ノードでない場合、依存されているタスクの最遅開始時刻の最小値を求める
      if (node.dependents.length > 0) {
        let minDependentStart = Infinity;
        node.dependents.forEach((depName) => {
          const depNode = nodeMap.get(depName);
          if (depNode) {
            minDependentStart = Math.min(
              minDependentStart,
              depNode.latestStart,
            );
          }
        });
        node.latestFinish = minDependentStart;
      }

      node.latestStart = node.latestFinish - node.weight;
      node.buffer = node.latestStart - node.earliestStart;
    }
  };

  // クリティカルパスの抽出
  const extractCriticalPath = (
    nodeMap: Map<string, TaskNode>,
  ): CriticalPathEdge[] => {
    const criticalEdges: CriticalPathEdge[] = [];

    // バッファ（余裕時間）が0のタスクがクリティカルパス上のタスク
    const criticalTasks = Array.from(nodeMap.values()).filter(
      (node) => Math.abs(node.buffer) < 0.001, // 浮動小数点誤差を考慮
    );

    // クリティカルタスク間の依存関係を抽出（実際のクリティカルパスのみ）
    criticalTasks.forEach((task) => {
      // このタスクの最早開始時刻を決定した依存タスクを見つける
      let criticalPredecessor: TaskNode | null = null;
      let maxFinishTime = -1;
      
      task.dependencies.forEach((depName) => {
        const depTask = nodeMap.get(depName);
        if (depTask && Math.abs(depTask.buffer) < 0.001) {
          // 依存タスクもクリティカルパス上にあり、
          // かつその完了時刻がこのタスクの開始時刻と一致する場合
          if (Math.abs(depTask.earliestFinish - task.earliestStart) < 0.001) {
            if (depTask.earliestFinish > maxFinishTime) {
              maxFinishTime = depTask.earliestFinish;
              criticalPredecessor = depTask;
            }
          }
        }
      });
      
      // 実際のクリティカルパス上の先行タスクが見つかった場合のみエッジを追加
      if (criticalPredecessor) {
        criticalEdges.push({
          fromTaskId: criticalPredecessor.id,
          toTaskId: task.id,
          weight: criticalPredecessor.weight,
        });
      }
    });

    return criticalEdges;
  };

  // 循環依存チェック結果を保持
  const circularDependencyInfo = ref<{
    hasCircularDependency: boolean;
    unprocessedNodes: string[];
  }>({ hasCircularDependency: false, unprocessedNodes: [] });

  // クリティカルパスの計算
  const criticalPath = computed(() => {
    if (editorTasks.length === 0) return [];

    const nodeMap = buildTaskGraph();

    // 循環依存チェック
    const topologicalResult = topologicalSort(nodeMap);
    circularDependencyInfo.value = {
      hasCircularDependency: topologicalResult.hasCircularDependency,
      unprocessedNodes: topologicalResult.unprocessedNodes,
    };

    calculateEarliestTimes(nodeMap);
    calculateLatestTimes(nodeMap);

    // デバッグ用ログ
    console.log('=== Critical Path Analysis ===');
    nodeMap.forEach((node) => {
      console.log(
        `${node.name}: ES=${node.earliestStart}, EF=${node.earliestFinish}, LS=${node.latestStart}, LF=${node.latestFinish}, Buffer=${node.buffer}`,
      );
    });

    const criticalEdges = extractCriticalPath(nodeMap);
    console.log('Critical Path Edges:', criticalEdges);

    return criticalEdges;
  });

  // プロジェクトの総所要時間
  const projectDuration = computed(() => {
    if (editorTasks.length === 0) return 0;

    const nodeMap = buildTaskGraph();
    calculateEarliestTimes(nodeMap);

    return Math.max(
      ...Array.from(nodeMap.values()).map((node) => node.earliestFinish),
    );
  });

  // クリティカルパス上のタスク名一覧
  const criticalTaskNames = computed(() => {
    if (editorTasks.length === 0) return [];

    const nodeMap = buildTaskGraph();
    calculateEarliestTimes(nodeMap);
    calculateLatestTimes(nodeMap);

    return Array.from(nodeMap.values())
      .filter((node) => Math.abs(node.buffer) < 0.001)
      .map((node) => node.name);
  });

  // 依存関係エッジを取得
  const dependencyEdges = computed(() => {
    if (editorTasks.length === 0) return [];

    const nodeMap = buildTaskGraph();
    const edges: { fromTaskId: string; toTaskId: string }[] = [];

    nodeMap.forEach((node) => {
      node.dependencies.forEach((depName) => {
        const depNode = nodeMap.get(depName);
        if (depNode) {
          edges.push({
            fromTaskId: depNode.id,
            toTaskId: node.id,
          });
        }
      });
    });

    return edges;
  });

  // 循環依存エラーの管理（computed外で実行）
  watchEffect(() => {
    if (circularDependencyInfo.value.hasCircularDependency) {
      const errorMessage = `循環依存が検出されました。確認してください: ${circularDependencyInfo.value.unprocessedNodes.join(', ')}`;
      errorStore.addValidationError(errorMessage, {
        unprocessedNodes: circularDependencyInfo.value.unprocessedNodes,
      });
    } else if (
      circularDependencyInfo.value.unprocessedNodes.length === 0 &&
      editorTasks.length > 0
    ) {
      // 循環依存が解消されたらエラーをクリア
      errorStore.clearErrorsByType('validation');
    }
  });

  return {
    criticalPath,
    projectDuration,
    criticalTaskNames,
    dependencyEdges,
  };
};
