<template>
  <div class="w-full h-full relative">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :fit-view-on-init="true"
      :nodes-draggable="!readOnly"
      :nodes-connectable="!readOnly"
      :elements-selectable="!readOnly"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @connect="handleConnect"
      class="vue-flow-container"
    >
      <Background pattern-color="#e5e7eb" :gap="16" />
      <MiniMap />
      <Controls />

      <template #node-custom="{ data, id }">
        <TaskNode :data="data" :id="id" @click="handleTaskClick(id)" />
      </template>

      <template #edge-custom="edgeProps">
        <CustomEdge v-bind="edgeProps" :animated="true" />
      </template>
    </VueFlow>

    <!-- タスク詳細ダイアログ -->
    <TaskDetailDialog v-if="selectedTaskId" :task-id="selectedTaskId" />

    <!-- タスク追加パネル -->
    <div v-if="!readOnly" class="absolute top-4 right-4 z-10">
      <TaskAddButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { VueFlow } from '@vue-flow/core';
import { Position } from '@vue-flow/core';
import type { Node, Edge, Connection } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { computed, watch } from 'vue';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

import { useEditorUIStore } from '../../store/editor_ui_store';
import { useCurrentTasks } from '../../store/task_store';
import TaskAddButton from '../grid-layout/TaskAddButton.vue';
import TaskDetailDialog from '../grid-layout/TaskDetailDialog.vue';

import CustomEdge from './CustomEdge.vue';
import TaskNode from './TaskNode.vue';

const props = defineProps<{
  readOnly: boolean;
}>();

const taskStore = useCurrentTasks();
const uiStore = useEditorUIStore();

const selectedTaskId = computed(() => uiStore.selectedTaskId);

// タスクからノードへの変換
const nodes = computed<Node[]>(() => {
  const tasks = taskStore.editorTasks;

  return tasks.map((task, index) => {
    // addition.layoutの値を使用、存在しない場合はデフォルト値を使用
    const position = task.task.addition?.layout
      ? {
          x: task.task.addition.layout.x * 250, // x座標を250px間隔に変換
          y: task.task.addition.layout.y * 40, // y座標を40px間隔に変換
        }
      : {
          x: Math.floor(index / 5) * 250, // 横方向に配置
          y: (index % 5) * 120, // 縦方向の間隔を調整
        };

    return {
      id: task.task.name,
      type: 'custom',
      position,
      data: {
        label: task.task.name,
        description: task.task.description,
        difficulty: task.task.difficulty || 0,
        field: task.task.addition?.field,
        category: task.task.addition?.category,
        issueNumber: task.task.issueNumber,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
});

// 依存関係からエッジへの変換
const edges = computed<Edge[]>(() => {
  const edgeList: Edge[] = [];
  const tasks = taskStore.editorTasks;

  tasks.forEach((task) => {
    if (task.task.depends && task.task.depends.length > 0) {
      task.task.depends.forEach((dep) => {
        edgeList.push({
          id: `${dep}-${task.task.name}`,
          source: dep,
          target: task.task.name,
          type: 'custom',
          animated: true,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
      });
    }
  });

  return edgeList;
});

// ノードクリックハンドラ
interface NodeClickEvent {
  node?: {
    id: string;
  };
}

const handleNodeClick = (event: NodeClickEvent) => {
  if (props.readOnly) return;
  const nodeId = event.node?.id;
  if (nodeId) {
    uiStore.selectTask(nodeId);
  }
};

// タスククリックハンドラ
const handleTaskClick = (taskId: string) => {
  if (props.readOnly) return;
  uiStore.selectTask(taskId);
};

// エッジクリックハンドラ
const handleEdgeClick = (_event: unknown) => {
  if (props.readOnly) return;
  // エッジクリック時の処理（必要に応じて実装）
};

// 接続ハンドラ
const handleConnect = (connection: Connection) => {
  if (props.readOnly) return;
  if (!connection.source || !connection.target) return;

  // 新しい依存関係を追加
  const targetTask = taskStore.editorTasks.find(
    (t) => t.task.name === connection.target,
  );
  if (targetTask) {
    const newDepends = [...(targetTask.task.depends || []), connection.source];
    taskStore.updateTask(connection.target, { depends: newDepends });
  }
};

// ノード位置の更新を監視
watch(
  nodes,
  (_newNodes) => {
    // 位置更新ロジックは必要に応じて実装
  },
  { deep: true },
);
</script>

<style scoped>
.vue-flow-container {
  background-color: #f9fafb;
}

/* エッジのアニメーション */
:deep(.vue-flow__edge-path) {
  stroke-linecap: round;
  stroke-linejoin: round;
}

:deep(.animated-edge .vue-flow__edge-path) {
  stroke-dasharray: 5 5;
  animation: dash 20s linear infinite;
}

@keyframes dash {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -100;
  }
}
</style>
