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
  slack: number; // 余裕時間
}

export const useCriticalPath = (editorTasks: EditorTask[]) => {
  // タスクグラフの構築
  const buildTaskGraph = () => {
    const nodeMap = new Map<string, TaskNode>();
    
    // 全タスクのノードを作成
    editorTasks.forEach(editorTask => {
      const task = editorTask.task;
      const cleanDependencies = task.depends.filter(dep => dep !== '');
      
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
        slack: 0
      });
    });
    
    // 依存関係（dependent）を構築
    nodeMap.forEach(node => {
      node.dependencies.forEach(depName => {
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
      node.dependencies.forEach(depName => {
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
    // プロジェクトの完了時刻を求める
    const projectFinish = Math.max(...Array.from(nodeMap.values()).map(node => node.earliestFinish));
    
    const visited = new Set<string>();
    
    const calculateNode = (nodeName: string): number => {
      if (visited.has(nodeName)) {
        return nodeMap.get(nodeName)!.latestStart;
      }
      
      const node = nodeMap.get(nodeName);
      if (!node) return projectFinish;
      
      visited.add(nodeName);
      
      // 依存されているタスクがない場合（終端ノード）
      if (node.dependents.length === 0) {
        node.latestFinish = projectFinish;
      } else {
        // 依存されているタスクの最早開始時刻を求める
        let minDependentStart = projectFinish;
        node.dependents.forEach(depName => {
          const depStart = calculateNode(depName);
          minDependentStart = Math.min(minDependentStart, depStart);
        });
        node.latestFinish = minDependentStart;
      }
      
      node.latestStart = node.latestFinish - node.weight;
      node.slack = node.latestStart - node.earliestStart;
      
      return node.latestStart;
    };
    
    // 全ノードの最遅時刻を計算
    nodeMap.forEach((_, nodeName) => {
      calculateNode(nodeName);
    });
  };

  // クリティカルパスの抽出
  const extractCriticalPath = (nodeMap: Map<string, TaskNode>): CriticalPathEdge[] => {
    const criticalEdges: CriticalPathEdge[] = [];
    
    // スラックが0のタスクがクリティカルパス上のタスク
    const criticalTasks = Array.from(nodeMap.values()).filter(node => 
      Math.abs(node.slack) < 0.001 // 浮動小数点誤差を考慮
    );
    
    // クリティカルタスク間の依存関係を抽出
    criticalTasks.forEach(task => {
      task.dependencies.forEach(depName => {
        const depTask = nodeMap.get(depName);
        if (depTask && Math.abs(depTask.slack) < 0.001) {
          // 依存タスクもクリティカルパス上にある場合
          criticalEdges.push({
            fromTaskId: depTask.id,
            toTaskId: task.id,
            weight: depTask.weight
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
    
    return extractCriticalPath(nodeMap);
  });

  // プロジェクトの総所要時間
  const projectDuration = computed(() => {
    if (editorTasks.length === 0) return 0;
    
    const nodeMap = buildTaskGraph();
    calculateEarliestTimes(nodeMap);
    
    return Math.max(...Array.from(nodeMap.values()).map(node => node.earliestFinish));
  });

  // クリティカルパス上のタスク名一覧
  const criticalTaskNames = computed(() => {
    if (editorTasks.length === 0) return [];
    
    const nodeMap = buildTaskGraph();
    calculateEarliestTimes(nodeMap);
    calculateLatestTimes(nodeMap);
    
    return Array.from(nodeMap.values())
      .filter(node => Math.abs(node.slack) < 0.001)
      .map(node => node.name);
  });

  return {
    criticalPath,
    projectDuration,
    criticalTaskNames
  };
};