# Viewer機能のEditor統合リファクタリング計画

## 概要
現在のEditor/Viewer分離構成を統合し、EditorGridをベースとした単一コンポーネントでread-onlyモードを実装する。

## 現在の問題点
- EditorとViewerで異なる表示ロジックを持っている
- コードの重複が発生している
- 保守性が低い（2つの表示システムを維持）

## 目標
- Editor相当の見た目をViewerに移植
- 実装の共通化
- GitHub Pages公開に向けた準備

## 実装計画

### 1. コンポーネント構造の変更

#### 削除対象
- `components/viewer/EditorViewer.vue`
- `components/viewer/TaskDialog.vue`
- `components/viewer/TaskgraphViewer.vue`
- `pages/ViewerPage.vue`
- `pages/EditorPage.vue`

#### 移動対象
```
components/editor/* → components/
```

具体的には：
- `EditorGrid.vue`
- `TaskCard.vue`
- `Curve.vue`
- `InfoEditDialog.vue`
- `TaskAddButton.vue`
- `TaskAddPanel.vue`
- `TaskDetailDialog.vue`

### 2. コンポーネント機能拡張

#### TaskCard.vue
- `readOnly: boolean` propsを追加
- 編集機能の条件表示：
  - 削除ボタン（×ボタン）
  - ドラッグハンドル（dependency-handle）
  - ドラッグ&ドロップ機能

#### EditorGrid.vue
- `readOnly: boolean` propsを追加
- 編集機能の条件表示：
  - TaskAddButton
  - TaskAddPanel
  - GridLayoutの編集機能（isDraggable, isResizable）
  - 依存関係の削除（handleConnectionClick）

### 3. 既存コンポーネント活用

#### 共通化済み
- `TaskDetail.vue` - 既に両方で使用中
- `ErrorDisplay.vue` - 共通コンポーネント
- `TaskInfoSignal.vue` - 共通コンポーネント

#### 流用可能
- `Curve.vue` - 矢印描画ロジック
- SVGエクスポート機能は既存の`useGraphExport`を活用

### 4. 統合後の構成

#### TaskgraphEditor.vue での使用
```vue
<EditorGrid
  v-model:selecting="isSelecting"
  :compact-mode="compactMode"
  :read-only="currentMode === 'viewer'"
  class="h-full"
/>
```

#### ディレクトリ構成
```
components/
├── common/              # そのまま
├── EditorGrid.vue       # editor/ から移動
├── TaskCard.vue         # editor/ から移動
├── Curve.vue           # editor/ から移動
├── InfoEditDialog.vue  # editor/ から移動
├── TaskAddButton.vue   # editor/ から移動
├── TaskAddPanel.vue    # editor/ から移動
└── TaskDetailDialog.vue # editor/ から移動
```

### 5. インポート更新

#### 主な更新対象ファイル
- `pages/TaskgraphEditor.vue` - ViewerPage/EditorPageの直接使用に変更
- 各コンポーネントの相互参照パス

## 実装メリット

1. **コード重複削除** - 2つの異なる表示ロジックを統一
2. **見た目統一** - Editorと完全同じ見た目をViewerで実現
3. **保守性向上** - 1つのコンポーネントで両方対応
4. **GitHub Pages対応** - 軽量化されたViewer機能
5. **localStorage対応準備** - 統一されたデータ管理

## 注意事項

- TaskCard.vueは既に表示ロジックが充実しているため、これをベースとする
- EditorGridの編集機能を条件表示で無効化するだけで、ほぼ完成形になる
- 既存のstoreやcomposablesはそのまま流用可能
- テスト動作確認は `tg run`, `tg lint`, `tg test` で実施

## 実装手順

1. TaskCard.vueにreadOnlyモード追加
2. EditorGrid.vueにreadOnlyモード追加
3. TaskgraphEditor.vueを直接EditorGrid使用に変更
4. components/editor/* を components/ に移動
5. 不要なviewer/*とpage/*を削除
6. インポートパス更新
7. 動作確認とテスト実行
