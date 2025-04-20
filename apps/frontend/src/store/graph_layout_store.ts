import { ref, computed } from 'vue';

import type { EditorTask } from '../model/EditorTask';

import type { GraphNode } from './types/graph_types';
import { GRAPH_SETTINGS } from './types/graph_types';

export const useGraphLayout = () => {
  // グラフレイアウト用の状態
  const graphNodes = ref<GraphNode[]>([]);
  const canvasWidth = ref(1200);
  const canvasHeight = ref(800);

  // グラフのパスデータを取得（矢印描画用）
  const graphPaths = computed(() => {
    const result: { from: GraphNode; to: GraphNode }[] = [];

    graphNodes.value.forEach((node) => {
      node.parents.forEach((parentName) => {
        const parentNode = graphNodes.value.find((n) => n.name === parentName);
        if (parentNode) {
          result.push({ from: parentNode, to: node });
        }
      });
    });

    return result;
  });

  // ノードの配置計算メインメソッド
  const buildGraphData = (editorTasks: EditorTask[]) => {
    const nodesMap = new Map<string, GraphNode>();

    // 各タスクのノード情報を作成
    editorTasks.forEach((editorTask) => {
      const task = editorTask.task;

      nodesMap.set(task.name, {
        id: editorTask.id,
        name: task.name,
        description: task.description,
        difficulty: task.difficulty,
        level: 0,
        treeIndex: 0,
        children: [],
        parents: task.depends.filter((dep) => dep !== ''),
        x: 0,
        y: 0,
      });
    });

    // 子ノードの関係を構築
    nodesMap.forEach((node, name) => {
      node.parents.forEach((parentName) => {
        const parentNode = nodesMap.get(parentName);
        if (parentNode) {
          parentNode.children.push(name);
        }
      });
    });

    // 木を識別し、各ノードのレベルを計算
    identifyTreesAndCalculateLevel(nodesMap);

    // ノードの配置を計算
    positionNodesHorizontally(nodesMap);

    // 結果を保存
    graphNodes.value = Array.from(nodesMap.values());
  };

  // 木を識別し、各ノードのレベルを計算
  const identifyTreesAndCalculateLevel = (nodesMap: Map<string, GraphNode>) => {
    // すでに訪問済みのノードを記録
    const visited = new Set<string>();

    // ルートノード（依存がないノード）を特定
    const rootNodes = Array.from(nodesMap.values()).filter(
      (node) =>
        node.parents.length === 0 || node.parents.every((p) => p === ''),
    );

    if (rootNodes.length === 0 && nodesMap.size > 0) {
      // 循環依存がある場合やルートが見つからない場合の対応
      const arbitraryNode = findBestRootCandidateForCyclicGraph(nodesMap);
      if (arbitraryNode) {
        rootNodes.push(arbitraryNode);
        arbitraryNode.parents = []; // 依存関係をクリアして強制的にルートに
      }
    }

    // 各ルートノードから木を処理
    let treeIndex = 0;

    rootNodes.forEach((rootNode) => {
      // 各木のインデックスを設定（縦に並べるため）
      rootNode.treeIndex = treeIndex++;

      // BFSでレベル（水平方向の位置）を割り当て
      const queue: { name: string; level: number; treeIndex: number }[] = [
        {
          name: rootNode.name,
          level: 0,
          treeIndex: rootNode.treeIndex,
        },
      ];

      while (queue.length > 0) {
        const { name, level, treeIndex } = queue.shift()!;
        const node = nodesMap.get(name);

        if (node && !visited.has(name)) {
          node.level = Math.max(node.level, level);
          node.treeIndex = treeIndex;
          visited.add(name);

          // 子ノードをキューに追加
          node.children.forEach((childName) => {
            queue.push({
              name: childName,
              level: level + 1,
              treeIndex: treeIndex,
            });
          });
        }
      }
    });

    // 孤立したノードの処理
    const isolatedNodes = Array.from(nodesMap.values()).filter(
      (node) =>
        !visited.has(node.name) &&
        (node.parents.length === 0 || node.parents.every((p) => p === '')) &&
        node.children.length === 0,
    );

    isolatedNodes.forEach((node) => {
      node.treeIndex = treeIndex++;
      visited.add(node.name);
    });

    // 未訪問ノードの処理
    const unvisitedNodes = Array.from(nodesMap.values()).filter(
      (node) => !visited.has(node.name),
    );

    if (unvisitedNodes.length > 0) {
      handleUnreachableNodes(unvisitedNodes, treeIndex, visited, nodesMap);
    }
  };

  // その他のヘルパーメソッド（コードの重複を避けるため省略）
  const findBestRootCandidateForCyclicGraph = (
    nodesMap: Map<string, GraphNode>,
  ) => {
    // 入次数が最も少ないノードを選択
    let bestCandidate = nodesMap.values().next().value;
    let minInDegree = Infinity;

    nodesMap.forEach((node) => {
      const effectiveParents = node.parents.filter((p) => p !== '');
      if (effectiveParents.length < minInDegree) {
        minInDegree = effectiveParents.length;
        bestCandidate = node;
      }
    });

    return bestCandidate;
  };

  // 到達不能なノード（閉路内のノードなど）を処理
  const handleUnreachableNodes = (
    unvisitedNodes: GraphNode[],
    startTreeIndex: number,
    visited: Set<string>,
    nodesMap: Map<string, GraphNode>,
  ) => {
    let treeIndex = startTreeIndex;

    // 未訪問ノード群から新たなルートを選定
    while (unvisitedNodes.length > 0) {
      // まず未訪問ノードのうち、親が最も少ないものを選択
      const newRoot = unvisitedNodes.reduce((best, current) => {
        const bestEffectiveParents = best.parents.filter((p) => p !== '');
        const currentEffectiveParents = current.parents.filter((p) => p !== '');
        return currentEffectiveParents.length < bestEffectiveParents.length
          ? current
          : best;
      }, unvisitedNodes[0]);

      newRoot.treeIndex = treeIndex++;

      // 新たなルートを起点にBFS
      const queue: { name: string; level: number; treeIndex: number }[] = [
        {
          name: newRoot.name,
          level: 0,
          treeIndex: newRoot.treeIndex,
        },
      ];

      while (queue.length > 0) {
        const { name, level, treeIndex } = queue.shift()!;
        const node = nodesMap.get(name);

        if (node && !visited.has(name)) {
          node.level = Math.max(node.level, level);
          node.treeIndex = treeIndex;
          visited.add(name);

          // unvisitedNodesから削除
          const nodeIndex = unvisitedNodes.findIndex((n) => n.name === name);
          if (nodeIndex !== -1) {
            unvisitedNodes.splice(nodeIndex, 1);
          }

          // 子ノードをキューに追加（未訪問のもののみ）
          node.children.forEach((childName) => {
            if (!visited.has(childName)) {
              queue.push({
                name: childName,
                level: level + 1,
                treeIndex: treeIndex,
              });
            }
          });
        }
      }
    }
  };

  // ノードの表示位置を計算（横方向に広がる木を縦に配置）
  const positionNodesHorizontally = (nodesMap: Map<string, GraphNode>) => {
    // 木ごとにノードをグループ化
    const treeGroups = new Map<number, GraphNode[]>();

    nodesMap.forEach((node) => {
      if (!treeGroups.has(node.treeIndex)) {
        treeGroups.set(node.treeIndex, []);
      }
      treeGroups.get(node.treeIndex)!.push(node);
    });

    // 各木の最大レベルを計算
    const treeMaxLevels = new Map<number, number>();
    treeGroups.forEach((nodes, treeIndex) => {
      const maxLevel = Math.max(...nodes.map((node) => node.level), 0);
      treeMaxLevels.set(treeIndex, maxLevel);
    });

    // 木の数を取得
    const treeCount = treeGroups.size;

    // キャンバスサイズの計算
    // 横方向：すべての木の中で最も深いレベル+1 × ノード幅と間隔
    const maxLevel = Math.max(...Array.from(treeMaxLevels.values()), 0);
    const totalWidth =
      (maxLevel + 1) *
        (GRAPH_SETTINGS.nodeWidth + GRAPH_SETTINGS.horizontalSpacing) +
      100;

    // 縦方向：木の数 × 必要な高さ
    const totalHeight =
      treeCount * (GRAPH_SETTINGS.nodeHeight + GRAPH_SETTINGS.treeSpacing) +
      100;

    canvasWidth.value = Math.max(1000, totalWidth);
    canvasHeight.value = Math.max(600, totalHeight);

    // 各木ごとにノードを配置
    treeGroups.forEach((nodes, treeIndex) => {
      // レベルでグループ化
      const levelGroups = new Map<number, GraphNode[]>();

      nodes.forEach((node) => {
        if (!levelGroups.has(node.level)) {
          levelGroups.set(node.level, []);
        }
        levelGroups.get(node.level)!.push(node);
      });

      // 各レベルごとにノードを配置
      levelGroups.forEach((levelNodes, level) => {
        levelNodes.forEach((node, index) => {
          // X座標：レベルに応じて水平方向に配置
          node.x =
            level *
              (GRAPH_SETTINGS.nodeWidth + GRAPH_SETTINGS.horizontalSpacing) +
            50;

          // Y座標：木のインデックスと同じレベルのノード数に基づいて配置
          const baseY =
            treeIndex *
              (GRAPH_SETTINGS.nodeHeight + GRAPH_SETTINGS.treeSpacing) +
            50;
          const levelWidth =
            levelNodes.length * GRAPH_SETTINGS.nodeHeight +
            (levelNodes.length - 1) * GRAPH_SETTINGS.verticalSpacing;
          const startY = baseY + (GRAPH_SETTINGS.treeSpacing - levelWidth) / 2;

          node.y =
            startY +
            index *
              (GRAPH_SETTINGS.nodeHeight + GRAPH_SETTINGS.verticalSpacing);
        });
      });
    });
  };
  // パスの描画用SVGパス文字列を生成
  const getPathD = (from: GraphNode, to: GraphNode) => {
    const fromX = from.x + GRAPH_SETTINGS.nodeWidth;
    const fromY = from.y + GRAPH_SETTINGS.nodeHeight / 2;
    const toX = to.x;
    const toY = to.y + GRAPH_SETTINGS.nodeHeight / 2;

    const controlX = (fromX + toX) / 2;

    return `M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`;
  };

  // 難易度に応じた色クラスを返す
  const getDifficultyColor = (difficulty: number) => {
    const colors = [
      'bg-green-100 border-green-300', // 1
      'bg-yellow-100 border-yellow-300', // 2
      'bg-orange-100 border-orange-300', // 3
      'bg-red-100 border-red-300', // 4
      'bg-purple-100 border-purple-300', // 5
    ];

    const index = Math.min(
      Math.max(Math.floor(difficulty) - 1, 0),
      colors.length - 1,
    );
    return colors[index];
  };

  return {
    graphNodes,
    canvasWidth,
    canvasHeight,
    graphPaths,
    buildGraphData,
    getPathD,
    getDifficultyColor,
    GRAPH_SETTINGS,
  };
};
