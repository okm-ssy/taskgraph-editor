export interface GraphNode {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  level: number; // 木の中での水平位置
  treeIndex: number; // 木の識別インデックス（縦方向の位置決め用）
  children: string[];
  parents: string[];
  x: number;
  y: number;
}

export const GRAPH_SETTINGS = {
  nodeWidth: 180,
  nodeHeight: 100,
  horizontalSpacing: 200, // 同じ木内のノード間水平間隔
  verticalSpacing: 150, // 同じレベルのノード間垂直間隔
  treeSpacing: 200, // 異なる木の間の垂直間隔
};
