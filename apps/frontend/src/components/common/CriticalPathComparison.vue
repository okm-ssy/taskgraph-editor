<template>
  <div class="p-6 space-y-6">
    <h2 class="text-2xl font-bold mb-4">クリティカルパス計算の比較</h2>

    <!-- サンプルデータ表示 -->
    <div class="bg-gray-100 p-4 rounded">
      <h3 class="font-semibold mb-2">テスト用タスクグラフ</h3>
      <div class="text-sm">
        <div>
          root-task (難易度: 1) → sub-task-1 (難易度: 2), sub-task-2 (難易度: 3)
        </div>
        <div>sub-task-1, sub-task-2 → leaf-task (難易度: 4)</div>
        <div class="mt-2 text-blue-600">
          期待されるクリティカルパス: root-task → sub-task-2 → leaf-task
          (総時間: 8)
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 現在の実装 -->
      <div class="border p-4 rounded">
        <h3 class="font-semibold text-red-600 mb-3">現在の実装（問題あり）</h3>
        <div class="space-y-2 text-sm">
          <div><strong>プロジェクト期間:</strong> {{ originalDuration }}</div>
          <div>
            <strong>クリティカルタスク:</strong>
            {{ originalCriticalTasks.join(', ') }}
          </div>
          <div>
            <strong>クリティカルパス:</strong>
            {{ originalCriticalPath.length }} エッジ
          </div>
          <div v-if="originalCriticalPath.length === 0" class="text-red-500">
            ⚠️ クリティカルパスが正しく検出されていません
          </div>
        </div>
      </div>

      <!-- 改善版の実装 -->
      <div class="border p-4 rounded">
        <h3 class="font-semibold text-green-600 mb-3">
          改善版の実装（修正済み）
        </h3>
        <div class="space-y-2 text-sm">
          <div><strong>プロジェクト期間:</strong> {{ fixedDuration }}</div>
          <div>
            <strong>クリティカルタスク:</strong>
            {{ fixedCriticalTasks.join(', ') }}
          </div>
          <div>
            <strong>クリティカルパス:</strong>
            {{ fixedCriticalPath.length }} エッジ
          </div>
          <div v-if="fixedCriticalPath.length > 0" class="text-green-500">
            ✓ 正しいクリティカルパスが検出されました
          </div>
        </div>
      </div>
    </div>

    <!-- 詳細比較 -->
    <div class="space-y-4">
      <h3 class="font-semibold">詳細比較</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="font-medium text-red-600 mb-2">現在の実装の問題点</h4>
          <ul class="text-sm space-y-1 list-disc list-inside">
            <li>冗長依存除去アルゴリズムが不完全</li>
            <li>トポロジカルソートを使用していない</li>
            <li>フォワード/バックワードパスの計算順序が不適切</li>
            <li>終端ノードの処理に問題</li>
          </ul>
        </div>

        <div>
          <h4 class="font-medium text-green-600 mb-2">改善版の特徴</h4>
          <ul class="text-sm space-y-1 list-disc list-inside">
            <li>トポロジカルソート（カーンのアルゴリズム）を使用</li>
            <li>依存関係に基づく正しい計算順序を保証</li>
            <li>冗長依存除去を行わず、元の依存関係を維持</li>
            <li>プロジェクト全体の終了時刻を正しく算出</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- クリティカルパスの可視化 -->
    <div v-if="fixedCriticalPath.length > 0" class="space-y-2">
      <h4 class="font-medium">検出されたクリティカルパス</h4>
      <div class="bg-green-50 p-3 rounded text-sm">
        <div
          v-for="(edge, index) in fixedCriticalPath"
          :key="index"
          class="flex items-center space-x-2"
        >
          <span class="px-2 py-1 bg-green-200 rounded text-xs">
            {{ getTaskName(edge.fromTaskId) }}
          </span>
          <span>→</span>
          <span class="px-2 py-1 bg-green-200 rounded text-xs">
            {{ getTaskName(edge.toTaskId) }}
          </span>
          <span class="text-gray-500">(重み: {{ edge.weight }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCriticalPath } from '../../composables/useCriticalPath';
import { useCriticalPathFixed } from '../../composables/useCriticalPathFixed';
import { EditorTask } from '../../model/EditorTask';

// テスト用のサンプルデータを作成
const createSampleTasks = (): EditorTask[] => {
  const tasks: EditorTask[] = [];

  // root-task
  const rootTask = new EditorTask();
  rootTask.task.name = 'root-task';
  rootTask.task.difficulty = 1;
  rootTask.task.depends = [];
  rootTask.task.description = 'ルートタスク';
  tasks.push(rootTask);

  // sub-task-1
  const subTask1 = new EditorTask();
  subTask1.task.name = 'sub-task-1';
  subTask1.task.difficulty = 2;
  subTask1.task.depends = ['root-task'];
  subTask1.task.description = 'サブタスク1';
  tasks.push(subTask1);

  // sub-task-2
  const subTask2 = new EditorTask();
  subTask2.task.name = 'sub-task-2';
  subTask2.task.difficulty = 3;
  subTask2.task.depends = ['root-task'];
  subTask2.task.description = 'サブタスク2';
  tasks.push(subTask2);

  // leaf-task
  const leafTask = new EditorTask();
  leafTask.task.name = 'leaf-task';
  leafTask.task.difficulty = 4;
  leafTask.task.depends = ['sub-task-1', 'sub-task-2'];
  leafTask.task.description = 'リーフタスク';
  tasks.push(leafTask);

  return tasks;
};

const sampleTasks = createSampleTasks();

// 現在の実装
const {
  criticalPath: originalCriticalPath,
  projectDuration: originalDuration,
  criticalTaskNames: originalCriticalTasks,
} = useCriticalPath(sampleTasks);

// 改善版の実装
const {
  criticalPath: fixedCriticalPath,
  projectDuration: fixedDuration,
  criticalTaskNames: fixedCriticalTasks,
} = useCriticalPathFixed(sampleTasks);

// タスク名を取得するヘルパー関数
const getTaskName = (taskId: string): string => {
  const task = sampleTasks.find((t) => t.id === taskId);
  return task ? task.task.name : taskId;
};
</script>
