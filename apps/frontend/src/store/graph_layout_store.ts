import { ref, computed } from 'vue';

import { LAYOUT } from '../constants';
import type { EditorTask } from '../model/EditorTask';

import type { GraphNode } from './types/graph_types';
import { GRAPH_SETTINGS } from './types/graph_types';

export const useGraphLayout = () => {
  // グラフレイアウト用の状態
  const graphNodes = ref<GraphNode[]>([]);
  const canvasWidth = ref(LAYOUT.CANVAS.MIN_WIDTH);
  const canvasHeight = ref(LAYOUT.CANVAS.INITIAL_HEIGHT);

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

    // タスク名の重複チェックを追加
    const taskNames = new Set<string>();
    editorTasks.forEach((task) => {
      if (taskNames.has(task.task.name)) {
        console.warn(`重複するタスク名が検出されました: ${task.task.name}`);
      }
      taskNames.add(task.task.name);
    });

    // 各タスクのノード情報を作成
    editorTasks.forEach((editorTask) => {
      const task = editorTask.task;

      // 空文字列の依存関係を除外する
      const cleanedParents = task.depends.filter((dep) => dep !== '');

      nodesMap.set(task.name, {
        id: editorTask.id,
        name: task.name,
        description: task.description,
        difficulty: task.difficulty,
        category: task.addition?.category || '',
        level: 0,
        treeIndex: 0,
        children: [],
        parents: cleanedParents, // 空文字列をフィルタリング
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

    // 各木のインデックスを設定
    let treeIndex = 0;
    rootNodes.forEach((rootNode) => {
      rootNode.treeIndex = treeIndex++;
    });

    // トポロジカルソートのように深さを計算
    const calculateDepth = (
      nodeName: string,
      currentTreeIndex: number,
      depthVisited: Set<string>,
    ) => {
      if (depthVisited.has(nodeName)) return;
      depthVisited.add(nodeName);

      const node = nodesMap.get(nodeName);
      if (!node) return;

      // 木のインデックスを設定
      node.treeIndex = currentTreeIndex;
      visited.add(nodeName);

      // 親がない場合はレベル0
      if (node.parents.length === 0 || node.parents.every((p) => p === '')) {
        node.level = 0;
      } else {
        // 親ノードの最大レベル + 1 を自分のレベルとする
        let maxParentLevel = -1;
        node.parents.forEach((parentName) => {
          if (parentName !== '') {
            // まだ処理されていない親がある場合、先に処理
            if (!depthVisited.has(parentName)) {
              calculateDepth(parentName, currentTreeIndex, depthVisited);
            }

            const parent = nodesMap.get(parentName);
            if (parent) {
              maxParentLevel = Math.max(maxParentLevel, parent.level);
            }
          }
        });

        node.level = maxParentLevel + 1;
      }

      // 子ノードを処理
      node.children.forEach((childName) => {
        if (!depthVisited.has(childName)) {
          calculateDepth(childName, currentTreeIndex, depthVisited);
        }
      });
    };

    // 各ルートノードから木を処理
    rootNodes.forEach((rootNode) => {
      const depthVisited = new Set<string>();
      calculateDepth(rootNode.name, rootNode.treeIndex, depthVisited);
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

    // 調整：垂直方向のスペーシングを縮小
    const adjustedVerticalSpacing = Math.max(
      30,
      GRAPH_SETTINGS.verticalSpacing / 2,
    ); // 垂直スペースを半分に
    const adjustedTreeSpacing = Math.max(80, GRAPH_SETTINGS.treeSpacing / 1.5); // 木間のスペースも縮小

    // キャンバスサイズの計算
    // 横方向：すべての木の中で最も深いレベル+1 × ノード幅と間隔
    const maxLevel = Math.max(...Array.from(treeMaxLevels.values()), 0);
    const totalWidth =
      (maxLevel + 1) *
        (GRAPH_SETTINGS.nodeWidth + GRAPH_SETTINGS.horizontalSpacing) +
      150; // 余白を追加

    // 各木のノード数を取得して、最も多いノードを持つ木を見つける
    let maxNodesInAnyTree = 0;
    treeGroups.forEach((nodes) => {
      maxNodesInAnyTree = Math.max(maxNodesInAnyTree, nodes.length);
    });

    // 垂直方向のサイズを計算（各木の高さの合計）
    let totalHeight = LAYOUT.MARGIN.INITIAL; // 初期マージン
    treeGroups.forEach((nodes) => {
      // 各レベルのノード数をカウント
      const levelsCount = new Map<number, number>();
      nodes.forEach((node) => {
        levelsCount.set(node.level, (levelsCount.get(node.level) || 0) + 1);
      });

      // この木の高さを計算
      let treeHeight = 0;
      levelsCount.forEach((count) => {
        treeHeight = Math.max(
          treeHeight,
          count * GRAPH_SETTINGS.nodeHeight +
            (count - 1) * adjustedVerticalSpacing,
        );
      });

      totalHeight += treeHeight + adjustedTreeSpacing;
    });

    // 最小サイズを確保
    canvasWidth.value = Math.max(LAYOUT.CANVAS.MIN_WIDTH, totalWidth);
    canvasHeight.value = Math.max(LAYOUT.CANVAS.MIN_HEIGHT, totalHeight);

    // 位置の追跡用
    let currentYOffset = 80; // 初期オフセット

    // 各木ごとにノードを配置
    treeGroups.forEach((nodes, _treeIndex) => {
      // レベルでグループ化
      const levelGroups = new Map<number, GraphNode[]>();

      nodes.forEach((node) => {
        if (!levelGroups.has(node.level)) {
          levelGroups.set(node.level, []);
        }
        levelGroups.get(node.level)!.push(node);
      });

      // この木の高さを計算
      let thisTreeHeight = 0;
      levelGroups.forEach((levelNodes) => {
        thisTreeHeight = Math.max(
          thisTreeHeight,
          levelNodes.length * GRAPH_SETTINGS.nodeHeight +
            (levelNodes.length - 1) * adjustedVerticalSpacing,
        );
      });

      // 各レベルごとにノードを配置
      levelGroups.forEach((levelNodes, level) => {
        const nodesInThisLevel = levelNodes.length;

        // このレベルの開始Y位置を計算
        const levelStartY =
          currentYOffset +
          (thisTreeHeight -
            (nodesInThisLevel * GRAPH_SETTINGS.nodeHeight +
              (nodesInThisLevel - 1) * adjustedVerticalSpacing)) /
            2;

        levelNodes.forEach((node, index) => {
          // X座標：レベルに応じて水平方向に配置
          node.x =
            level *
              (GRAPH_SETTINGS.nodeWidth + GRAPH_SETTINGS.horizontalSpacing) +
            50;

          // Y座標：縦方向のスペースを調整して配置
          node.y =
            levelStartY +
            index * (GRAPH_SETTINGS.nodeHeight + adjustedVerticalSpacing);
        });
      });

      // 次の木のY開始位置を更新
      currentYOffset += thisTreeHeight + adjustedTreeSpacing;
    });

    // すべてのノードの位置範囲を計算
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodesMap.forEach((node) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + GRAPH_SETTINGS.nodeWidth);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + GRAPH_SETTINGS.nodeHeight);
    });

    // 自動的にキャンバスサイズを調整
    canvasWidth.value = Math.max(
      LAYOUT.CANVAS.MIN_WIDTH,
      maxX + LAYOUT.PADDING.RIGHT,
    ); // 右端に余白を追加
    canvasHeight.value = Math.max(
      LAYOUT.CANVAS.MIN_HEIGHT,
      maxY + LAYOUT.PADDING.BOTTOM,
    ); // 下端に余白を追加
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

  // グラフ座標をグリッド座標に変換する機能
  const convertGraphToGrid = (editorTasks: EditorTask[]) => {
    // まずグラフレイアウトを計算
    buildGraphData(editorTasks);

    // グリッド設定
    const GRID_SETTINGS = {
      colNum: 100,
      rowHeight: LAYOUT.GRID.ROW_HEIGHT.NORMAL,
      margin: [LAYOUT.GRID.MARGIN.NORMAL, LAYOUT.GRID.MARGIN.NORMAL],
      gridItemWidth: 3, // デフォルトのグリッドアイテム幅
      gridItemHeight: 3, // デフォルトのグリッドアイテム高さ
    };

    // ピクセル座標をグリッド座標に変換
    const pixelToGrid = (pixelX: number, pixelY: number) => {
      // グリッドの実際のセル幅を計算（マージンを考慮）
      const effectiveGridWidth =
        (canvasWidth.value -
          (GRID_SETTINGS.colNum + 1) * GRID_SETTINGS.margin[0]) /
        GRID_SETTINGS.colNum;
      const effectiveGridHeight = GRID_SETTINGS.rowHeight;

      // ピクセル座標をグリッド座標に変換
      const gridX = Math.round(
        pixelX / (effectiveGridWidth + GRID_SETTINGS.margin[0]),
      );
      const gridY = Math.round(
        pixelY / (effectiveGridHeight + GRID_SETTINGS.margin[1]),
      );

      // グリッドの境界内に収める
      const clampedX = Math.max(
        0,
        Math.min(gridX, GRID_SETTINGS.colNum - GRID_SETTINGS.gridItemWidth),
      );
      const clampedY = Math.max(0, gridY);

      return { x: clampedX, y: clampedY };
    };

    // 各EditorTaskのグリッド座標を更新
    editorTasks.forEach((editorTask) => {
      const graphNode = graphNodes.value.find(
        (node) => node.id === editorTask.id,
      );
      if (graphNode) {
        const gridPos = pixelToGrid(graphNode.x, graphNode.y);

        // EditorTaskのgrid座標を更新
        editorTask.grid.x = gridPos.x;
        editorTask.grid.y = gridPos.y;
        editorTask.grid.w = GRID_SETTINGS.gridItemWidth;
        editorTask.grid.h = GRID_SETTINGS.gridItemHeight;
      }
    });

    return editorTasks;
  };

  // グリッド配置の最適化（重複回避）
  const optimizeGridLayout = (editorTasks: EditorTask[]) => {
    const GRID_SETTINGS_LOCAL = {
      colNum: 100,
      gridItemWidth: 3,
      gridItemHeight: 3,
    };

    const occupiedPositions = new Set<string>();

    // Y座標でソート（上から下へ配置）
    const sortedTasks = [...editorTasks].sort((a, b) => a.grid.y - b.grid.y);

    sortedTasks.forEach((task) => {
      let { x, y } = task.grid;
      const { w, h } = task.grid;

      // 重複チェックとずらし処理
      while (isPositionOccupied(x, y, w, h, occupiedPositions)) {
        x++;
        // 右端に達したら次の行へ
        if (x + w > GRID_SETTINGS_LOCAL.colNum) {
          x = 0;
          y++;
        }
      }

      // 最終的な位置を設定
      task.grid.x = x;
      task.grid.y = y;

      // 占有位置を記録
      markPositionOccupied(x, y, w, h, occupiedPositions);
    });

    return editorTasks;
  };

  // 位置が占有されているかチェック
  const isPositionOccupied = (
    x: number,
    y: number,
    w: number,
    h: number,
    occupied: Set<string>,
  ) => {
    for (let i = x; i < x + w; i++) {
      for (let j = y; j < y + h; j++) {
        if (occupied.has(`${i},${j}`)) {
          return true;
        }
      }
    }
    return false;
  };

  // 位置を占有済みとしてマーク
  const markPositionOccupied = (
    x: number,
    y: number,
    w: number,
    h: number,
    occupied: Set<string>,
  ) => {
    for (let i = x; i < x + w; i++) {
      for (let j = y; j < y + h; j++) {
        occupied.add(`${i},${j}`);
      }
    }
  };

  return {
    graphNodes,
    canvasWidth,
    canvasHeight,
    graphPaths,
    buildGraphData,
    getPathD,
    convertGraphToGrid,
    optimizeGridLayout,
    GRAPH_SETTINGS,
  };
};
