import { computed } from 'vue';

import type { EditorTask } from '../model/EditorTask';

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

export const useCriticalPathFixed = (editorTasks: EditorTask[]) => {
  // タスクグラフの構築（冗長依存除去なし）
  const buildTaskGraph = () => {
    const nodeMap = new Map<string, TaskNode>();

    // 全タスクのノードを作成
    editorTasks.forEach((editorTask) => {
      const task = editorTask.task;
      const cleanDependencies = task.depends.filter((dep) => dep !== '');

      nodeMap.set(task.name, {
        id: editorTask.id,
        name: task.name,
        weight: task.difficulty,
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

  // トポロジカルソート（カーンのアルゴリズム）
  const topologicalSort = (nodeMap: Map<string, TaskNode>): string[] => {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // 各ノードの入次数を計算
    nodeMap.forEach((node, name) => {
      inDegree.set(name, node.dependencies.length);
      if (node.dependencies.length === 0) {
        queue.push(name);
      }
    });

    // トポロジカルソート実行
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const currentNode = nodeMap.get(current)!;
      currentNode.dependents.forEach((dependent) => {
        const newInDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newInDegree);
        if (newInDegree === 0) {
          queue.push(dependent);
        }
      });
    }

    // 循環依存チェック
    if (result.length !== nodeMap.size) {
      // 循環依存が検出された
    }

    return result;
  };

  // 逆トポロジカルソート
  const reverseTopologicalSort = (nodeMap: Map<string, TaskNode>): string[] => {
    const outDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // 各ノードの出次数を計算
    nodeMap.forEach((node, name) => {
      outDegree.set(name, node.dependents.length);
      if (node.dependents.length === 0) {
        queue.push(name);
      }
    });

    // 逆トポロジカルソート実行
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const currentNode = nodeMap.get(current)!;
      currentNode.dependencies.forEach((dependency) => {
        const newOutDegree = outDegree.get(dependency)! - 1;
        outDegree.set(dependency, newOutDegree);
        if (newOutDegree === 0) {
          queue.push(dependency);
        }
      });
    }

    return result;
  };

  // 最早開始時刻の計算（トポロジカルソート順）
  const calculateEarliestTimes = (nodeMap: Map<string, TaskNode>) => {
    const sortedNodes = topologicalSort(nodeMap);

    sortedNodes.forEach((nodeName) => {
      const node = nodeMap.get(nodeName)!;

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

  // 最遅開始時刻の計算（逆トポロジカルソート順）
  const calculateLatestTimes = (nodeMap: Map<string, TaskNode>) => {
    const reverseSortedNodes = reverseTopologicalSort(nodeMap);

    // プロジェクト全体の完了時刻を計算
    const projectEndTime = Math.max(
      ...Array.from(nodeMap.values()).map((node) => node.earliestFinish),
    );

    reverseSortedNodes.forEach((nodeName) => {
      const node = nodeMap.get(nodeName)!;

      // 終端ノード（依存されていないタスク）の場合
      if (node.dependents.length === 0) {
        node.latestFinish = projectEndTime;
      } else {
        // 依存されているタスクの最遅開始時刻の最小値を求める
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
    });
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

    // クリティカルタスク間の依存関係を抽出
    criticalTasks.forEach((task) => {
      task.dependencies.forEach((depName) => {
        const depTask = nodeMap.get(depName);
        if (depTask && Math.abs(depTask.buffer) < 0.001) {
          // 依存タスクもクリティカルパス上にある場合
          criticalEdges.push({
            fromTaskId: depTask.id,
            toTaskId: task.id,
            weight: depTask.weight,
          });
        }
      });
    });

    return criticalEdges;
  };

  // クリティカルパスの計算
  const criticalPath = computed(() => {
    if (editorTasks.length === 0) return [];

    const nodeMap = buildTaskGraph();
    calculateEarliestTimes(nodeMap);
    calculateLatestTimes(nodeMap);

    const criticalEdges = extractCriticalPath(nodeMap);

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

  // 通常の依存関係エッジを取得（冗長依存除去なし）
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

  return {
    criticalPath,
    projectDuration,
    criticalTaskNames,
    dependencyEdges,
  };
};
