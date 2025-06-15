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
  float: number; // 余裕時間
}

export const useCriticalPath = (editorTasks: EditorTask[]) => {
  // 冗長な依存関係を除去
  const removeRedundantDependencies = (nodeMap: Map<string, TaskNode>) => {
    nodeMap.forEach((node) => {
      const redundantDeps = new Set<string>();

      // 各直接依存について、他の直接依存を経由して到達可能かチェック
      node.dependencies.forEach((directDep) => {
        const visited = new Set<string>();
        const canReachViaOtherPath = (
          currentNode: string,
          target: string,
          excludeDirect: string,
        ): boolean => {
          if (visited.has(currentNode)) return false;
          visited.add(currentNode);

          const current = nodeMap.get(currentNode);
          if (!current) return false;

          for (const dep of current.dependencies) {
            if (dep === excludeDirect) continue; // 直接依存は除外
            if (dep === target) return true; // 目標に到達
            if (canReachViaOtherPath(dep, target, excludeDirect)) return true;
          }
          return false;
        };

        // 他の直接依存を経由してこの依存に到達可能なら冗長
        const otherDirectDeps = node.dependencies.filter(
          (dep) => dep !== directDep,
        );
        for (const otherDep of otherDirectDeps) {
          if (canReachViaOtherPath(otherDep, directDep, directDep)) {
            redundantDeps.add(directDep);
            break;
          }
        }
      });

      // 冗長な依存を除去
      node.dependencies = node.dependencies.filter(
        (dep) => !redundantDeps.has(dep),
      );
    });

    // dependent関係を再構築
    nodeMap.forEach((node) => {
      node.dependents = [];
    });
    nodeMap.forEach((node) => {
      node.dependencies.forEach((depName) => {
        const depNode = nodeMap.get(depName);
        if (depNode) {
          depNode.dependents.push(node.name);
        }
      });
    });
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
        float: 0,
      });
    });

    // 冗長な依存関係を除去
    removeRedundantDependencies(nodeMap);

    return nodeMap;
  };

  // 最早開始時刻の計算（フォワードパス）
  const calculateEarliestTimes = (nodeMap: Map<string, TaskNode>) => {
    const visited = new Set<string>();

    const calculateNode = (nodeName: string): number => {
      if (visited.has(nodeName)) {
        return nodeMap.get(nodeName)!.earliestFinish;
      }

      const node = nodeMap.get(nodeName);
      if (!node) return 0;

      visited.add(nodeName);

      // 依存タスクの最遅完了時刻を求める
      let maxDependencyFinish = 0;
      node.dependencies.forEach((depName) => {
        const depFinish = calculateNode(depName);
        maxDependencyFinish = Math.max(maxDependencyFinish, depFinish);
      });

      node.earliestStart = maxDependencyFinish;
      node.earliestFinish = node.earliestStart + node.weight;

      return node.earliestFinish;
    };

    // 全ノードの最早時刻を計算
    nodeMap.forEach((_, nodeName) => {
      calculateNode(nodeName);
    });
  };

  // 最遅開始時刻の計算（バックワードパス）
  const calculateLatestTimes = (nodeMap: Map<string, TaskNode>) => {
    const visited = new Set<string>();

    const calculateNode = (nodeName: string): number => {
      if (visited.has(nodeName)) {
        return nodeMap.get(nodeName)!.latestStart;
      }

      const node = nodeMap.get(nodeName);
      if (!node) return 0;

      visited.add(nodeName);

      // 依存されているタスクがない場合（終端ノード）
      if (node.dependents.length === 0) {
        node.latestFinish = node.earliestFinish; // 終端ノードは最早完了時刻と同じ
      } else {
        // 依存されているタスクの最遅開始時刻の最小値を求める
        let minDependentStart = Infinity;
        node.dependents.forEach((depName) => {
          const depStart = calculateNode(depName);
          minDependentStart = Math.min(minDependentStart, depStart);
        });
        node.latestFinish = minDependentStart;
      }

      node.latestStart = node.latestFinish - node.weight;
      node.float = node.latestStart - node.earliestStart;

      return node.latestStart;
    };

    // 全ノードの最遅時刻を計算
    nodeMap.forEach((_, nodeName) => {
      calculateNode(nodeName);
    });
  };

  // クリティカルパスの抽出
  const extractCriticalPath = (
    nodeMap: Map<string, TaskNode>,
  ): CriticalPathEdge[] => {
    const criticalEdges: CriticalPathEdge[] = [];

    // フロート（余裕時間）が0のタスクがクリティカルパス上のタスク
    const criticalTasks = Array.from(nodeMap.values()).filter(
      (node) => Math.abs(node.float) < 0.001, // 浮動小数点誤差を考慮
    );

    // クリティカルタスク間の依存関係を抽出
    criticalTasks.forEach((task) => {
      task.dependencies.forEach((depName) => {
        const depTask = nodeMap.get(depName);
        if (depTask && Math.abs(depTask.float) < 0.001) {
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

    // デバッグ用ログ
    console.log('=== Critical Path Analysis ===');
    nodeMap.forEach((node) => {
      console.log(
        `${node.name}: ES=${node.earliestStart}, EF=${node.earliestFinish}, LS=${node.latestStart}, LF=${node.latestFinish}, Float=${node.float}`,
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
      .filter((node) => Math.abs(node.float) < 0.001)
      .map((node) => node.name);
  });

  // 冗長依存除去後の依存関係エッジを取得
  const reducedDependencyEdges = computed(() => {
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
    reducedDependencyEdges,
  };
};
