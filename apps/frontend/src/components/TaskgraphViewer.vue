<script setup lang="ts">
import { ref, computed, onMounted, watch, defineProps } from 'vue';

import type { EditorTask } from '../model/EditorTask';

const props = defineProps<{
  editorTasks: EditorTask[];
}>();

// ノードの表示位置を計算するための状態
interface GraphNode {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  level: number;
  children: string[];
  parents: string[];
  x: number;
  y: number;
}

// グラフノード
const graphNodes = ref<GraphNode[]>([]);

// 描画用のキャンバスサイズ
const canvasWidth = ref(1000);
const canvasHeight = ref(600);
const nodeWidth = 180;
const nodeHeight = 100;
const horizontalSpacing = 200;
const verticalSpacing = 120;

// グラフデータを構築
const buildGraphData = () => {
  const nodesMap = new Map<string, GraphNode>();

  // 各タスクのノード情報を作成
  props.editorTasks.forEach((editorTask) => {
    const task = editorTask.task;

    nodesMap.set(task.name, {
      id: editorTask.id,
      name: task.name,
      description: task.description,
      difficulty: task.difficulty,
      level: 0, // 初期値、後で計算
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

  // レベル（深さ）を計算
  calculateLevels(nodesMap);

  // ノードの配置を計算
  positionNodes(nodesMap);

  // 結果を保存
  graphNodes.value = Array.from(nodesMap.values());
};

// 各ノードのレベル（左右の位置）を計算
const calculateLevels = (nodesMap: Map<string, GraphNode>) => {
  // ルートノード（依存がないノード）を特定
  const rootNodes = Array.from(nodesMap.values()).filter(
    (node) => node.parents.length === 0,
  );

  // 幅優先でレベルを割り当て
  const queue: { name: string; level: number }[] = rootNodes.map((node) => ({
    name: node.name,
    level: 0,
  }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { name, level } = queue.shift()!;
    const node = nodesMap.get(name);

    if (node && !visited.has(name)) {
      // より深いレベルで見つかった場合、最大値を採用
      node.level = Math.max(node.level, level);
      visited.add(name);

      // 子ノードをキューに追加
      node.children.forEach((childName) => {
        queue.push({ name: childName, level: level + 1 });
      });
    }
  }
};

// ノードの表示位置を計算
const positionNodes = (nodesMap: Map<string, GraphNode>) => {
  // レベル別にノードをグループ化
  const levelGroups = new Map<number, string[]>();

  nodesMap.forEach((node, name) => {
    if (!levelGroups.has(node.level)) {
      levelGroups.set(node.level, []);
    }
    levelGroups.get(node.level)!.push(name);
  });

  // 各レベルグループ内でノードのY座標を計算
  levelGroups.forEach((nodeNames, level) => {
    const groupHeight =
      nodeNames.length * nodeHeight + (nodeNames.length - 1) * verticalSpacing;
    const startY = (canvasHeight.value - groupHeight) / 2;

    nodeNames.forEach((name, index) => {
      const node = nodesMap.get(name);
      if (node) {
        node.x = level * (nodeWidth + horizontalSpacing);
        node.y = startY + index * (nodeHeight + verticalSpacing);
      }
    });
  });

  // キャンバスサイズの更新
  const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
  canvasWidth.value = (maxLevel + 1) * (nodeWidth + horizontalSpacing);
};

// パスのデータを計算
const paths = computed(() => {
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

// パスの描画用SVGパス文字列を生成
const getPathD = (from: GraphNode, to: GraphNode) => {
  const fromX = from.x + nodeWidth;
  const fromY = from.y + nodeHeight / 2;
  const toX = to.x;
  const toY = to.y + nodeHeight / 2;
  const controlX = (fromX + toX) / 2;

  return `M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`;
};

// 難易度に応じた色を返す
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

// プロパティの変更を監視
watch(
  () => props.editorTasks,
  () => {
    buildGraphData();
  },
  { deep: true },
);

// コンポーネントマウント時にグラフデータ構築
onMounted(() => {
  buildGraphData();
});
</script>

<template>
  <div class="overflow-auto border border-gray-300 rounded-lg bg-gray-50 p-4">
    <!-- グラフの表示エリア -->
    <div
      class="graph-container relative"
      :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
    >
      <!-- パスの描画 -->
      <svg
        class="absolute top-0 left-0"
        :width="canvasWidth"
        :height="canvasHeight"
      >
        <path
          v-for="(path, index) in paths"
          :key="index"
          :d="getPathD(path.from, path.to)"
          stroke="#666"
          stroke-width="2"
          fill="none"
          marker-end="url(#arrow)"
        ></path>

        <!-- 矢印マーカー -->
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"></path>
          </marker>
        </defs>
      </svg>

      <!-- ノードの描画 -->
      <div
        v-for="node in graphNodes"
        :key="node.id"
        class="absolute border-2 rounded-lg p-3 shadow-md transition-transform hover:translate-y-[-2px] hover:shadow-lg"
        :class="getDifficultyColor(node.difficulty)"
        :style="{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
        }"
      >
        <div class="font-bold truncate">{{ node.name }}</div>
        <div class="text-sm truncate">{{ node.description }}</div>
        <div class="text-xs mt-1">難易度: {{ node.difficulty }}</div>
      </div>
    </div>

    <!-- タスクがない場合のメッセージ -->
    <div v-if="graphNodes.length === 0" class="text-center py-10 text-gray-500">
      タスクデータがありません
    </div>
  </div>
</template>

<style scoped>
.graph-container {
  min-width: 800px;
  min-height: 400px;
}
</style>
