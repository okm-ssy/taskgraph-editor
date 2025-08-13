# ReadOnlyモード実装計画

## 概要
EditorGridとTaskCardにread-onlyモードを実装し、編集機能を条件表示で制御する。

## 前提条件
- `REFACTOR_PLAN.md`の実装完了
- components/editor/* が components/ に移動済み

## 実装対象コンポーネント

### 1. TaskCard.vue の修正

#### Props追加
```typescript
const props = defineProps<{
  task: Task;
  id: string;
  compact?: boolean;
  readOnly?: boolean; // 新規追加
}>();
```

#### 編集機能の条件表示
```vue
<template>
  <!-- 削除ボタン -->
  <button
    v-if="!readOnly"
    @click="handleRemove"
    class="task-action-button text-gray-500 hover:bg-white rounded-full p-1"
  >
    ×
  </button>

  <!-- source: 依存元（矢印の起点、ドラッグ可能） -->
  <div
    v-if="!readOnly"
    :id="`source-${id}`"
    class="dependency-handle absolute right-0 top-6 translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full h-4 w-4 cursor-move hover:scale-125 transition-transform"
    style="z-index: 20"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    title="ドラッグして依存関係を作成"
  />
</template>
```

#### ドラッグ&ドロップの制御
```typescript
// ドラッグオーバー（target へ）
const handleDragOver = (event: DragEvent) => {
  if (props.readOnly) return; // read-onlyモードでは無効
  
  if (dragDropStore.canDrop(props.id)) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'link';
    dragDropStore.setDroppableTarget(props.id);
  }
};

// ドロップ（依存関係を作成）
const handleDrop = (event: DragEvent) => {
  if (props.readOnly) return; // read-onlyモードでは無効
  
  event.preventDefault();
  // 既存の処理...
};
```

### 2. EditorGrid.vue の修正

#### Props追加
```typescript
const props = defineProps<{
  selecting?: boolean;
  compactMode?: boolean;
  readOnly?: boolean; // 新規追加
}>();
```

#### ヘッダーの条件表示
```vue
<template>
  <div class="flex justify-between items-center border-b bg-gray-50 p-3">
    <div class="flex items-center gap-4">
      <h3 class="font-semibold">
        {{ readOnly ? 'タスクグラフビューアー' : 'タスクグリッドエディター' }}
      </h3>
      <!-- 工数表示は共通 -->
      <div v-if="editorTasks.length > 0" class="text-sm text-gray-600">
        <span class="font-medium">総工数: {{ totalDifficulty.toFixed(2) }}h</span>
        <span v-if="completedDifficulty > 0" class="font-medium ml-3 text-green-600">
          終了: {{ completedDifficulty.toFixed(2) }}h
        </span>
      </div>
    </div>
    
    <!-- 編集用ボタン群 -->
    <div v-if="!readOnly" class="flex gap-2">
      <button
        class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
        @click="toggleAddPanel"
      >
        パネルで追加
      </button>
      <TaskAddButton @click="handleAddTask" />
    </div>
    
    <!-- 閲覧用ボタン群 -->
    <div v-else class="flex gap-2">
      <button
        @click="exportSvg"
        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        :disabled="isExporting"
      >
        SVGとして保存
      </button>
    </div>
  </div>
</template>
```

#### GridLayoutの編集機能制御
```vue
<GridLayout
  v-model:layout="layout"
  :col-num="layoutConfig.colNum"
  :width="LAYOUT.GRID.TOTAL_WIDTH"
  :row-height="layoutConfig.rowHeight"
  :is-draggable="!disableGrid && !readOnly"
  :is-resizable="!disableGrid && !readOnly"
  <!-- その他のprops -->
>
```

#### TaskCardへのreadOnly伝達
```vue
<TaskCard
  :task="task.task"
  :id="task.id"
  :compact="isCompactMode"
  :read-only="readOnly"
/>
```

#### 依存関係削除の制御
```typescript
// 依存関係クリック時の処理（削除）
const handleConnectionClick = (connection: Connection) => {
  if (props.readOnly) return; // read-onlyモードでは無効
  
  // 既存の削除処理...
};
```

#### 新規タスク追加パネルの制御
```vue
<!-- 新規タスク追加パネル -->
<TaskAddPanel
  v-if="uiStore.showAddPanel && !readOnly"
  @close="uiStore.toggleAddPanel"
/>
```

### 3. 関連コンポーネントの対応

#### TaskAddButton.vue
```vue
<!-- 使用箇所で条件表示されるため、コンポーネント自体の変更は不要 -->
```

#### TaskAddPanel.vue
```vue
<!-- 使用箇所で条件表示されるため、コンポーネント自体の変更は不要 -->
```

#### InfoEditDialog.vue
- read-onlyモードでも表示（情報確認のため）
- ただし編集ボタンは条件表示にする可能性あり

#### TaskDetailDialog.vue
- read-onlyモードでも表示（詳細確認のため）
- 編集ボタンの条件表示を検討

## SVGエクスポート機能の統合

### useGraphExport の活用
```typescript
// EditorGrid.vue内
import { useGraphExport } from '../store/use_graph_export';

const { setGraphRef, exportAsSvg } = useGraphExport();
const isExporting = ref(false);

const exportSvg = async () => {
  isExporting.value = true;
  try {
    // グリッドコンテナを参照として設定
    setGraphRef(gridContainer.value);
    await exportAsSvg();
  } finally {
    isExporting.value = false;
  }
};
```

## 状態管理の考慮

### Storeの制御
```typescript
// read-onlyモードではタスクの変更操作を無効化
const taskStore = useCurrentTasks();

// 条件付きでストア操作を実行
const updateTask = (id: string, updates: Partial<Task>) => {
  if (props.readOnly) return;
  taskStore.updateTask(id, updates);
};
```

### UIStoreの制御
```typescript
// 編集UI関連の状態は条件付きで更新
const uiStore = useEditorUIStore();

const toggleAddPanel = () => {
  if (props.readOnly) return;
  uiStore.toggleAddPanel();
};
```

## テスト項目

### 機能テスト
1. **read-only=false時**
   - すべての編集機能が動作する
   - タスクの追加・削除・移動が可能
   - 依存関係の作成・削除が可能

2. **read-only=true時**
   - 編集ボタンが表示されない
   - ドラッグ&ドロップが無効
   - タスク削除ボタンが表示されない
   - 依存関係の削除ができない
   - SVGエクスポートは動作する

### UI/UXテスト
1. **表示の確認**
   - ヘッダーテキストが適切に変更される
   - 編集用UIが適切に非表示になる
   - 閲覧用UIが適切に表示される

2. **操作の確認**
   - 無効化された操作でエラーが発生しない
   - ツールチップやホバー効果は正常動作
   - 詳細表示は正常動作

## 実装後の確認項目

### コンポーネント単位
- [ ] TaskCard の read-only モード動作確認
- [ ] EditorGrid の read-only モード動作確認
- [ ] SVGエクスポート機能の動作確認

### 統合テスト
- [ ] TaskgraphEditor からの read-only モード切り替え
- [ ] データの表示・非表示が適切
- [ ] パフォーマンスの劣化なし

### 回帰テスト
- [ ] 既存のエディター機能に影響なし
- [ ] 既存のビューアー機能が改善
- [ ] `tg lint` でエラーなし
- [ ] `tg test` で全テスト通過