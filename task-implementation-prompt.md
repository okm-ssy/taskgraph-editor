# タスク実装支援プロンプト

このプロンプトは、taskgraph-editorで管理されているタスクを実装する際に、Claude Codeが効率的に作業を進めるための情報整理と実装アプローチを提供します。

## 背景・課題

現在のtaskgraph-editorでは、タスクの基本情報（名前、説明、依存関係、難易度等）は管理されていますが、実際の実装に必要な詳細情報が不足しています。このため、Claude Codeでタスクを実装する際に、以下の問題が発生します：

- 仕様が不明確で実装方針が立てられない
- 既存コードとの整合性が取れない
- テスト方法や受け入れ基準が不明
- デザイン・UI要件がわからない

## 実装に必要な情報

### 実装支援情報の整理方針

従来は詳細な仕様書やドキュメントが必要とされていましたが、Claude Codeによる効率的な実装のため、以下の**最小限の情報**に集約しました：

### タスクレベルで必要な情報
- **実装メモ**: 技術的な注意点や参考情報
- **UI要件**: 画面・操作に関する簡潔な説明
- **データ要件**: API・データベース処理の要点
- **受け入れ基準**: 完了判定の明確な基準
- **画面設計**: 関連する画面イメージへの参照

### プロジェクトレベルで必要な情報  
- **プロジェクト概要**: 目的と全体像
- **技術スタック**: 主要ライブラリ・フレームワーク
- **開発ガイドライン**: コーディング規約と注意事項
- **環境情報**: デプロイ・環境固有の設定
- **画面設計集**: プロジェクト全体の画面デザイン

## taskgraph-editorで管理すべき情報

### 型定義

```typescript
interface DesignImage {
  id: string;          // 画像の一意ID
  title: string;       // 画像のタイトル・説明
  filepath: string;    // 画像ファイルのパス
  tags?: string[];     // 検索用タグ（画面名、機能名等）
}
```

### タスクレベルで追加したい項目

```typescript
interface TaskExtended {
  // 既存項目
  name: string;
  description: string;
  depends: string[];
  difficulty: number;
  notes: string[];
  issueNumber?: number;

  // addition オブジェクト内の項目
  addition?: {
    // 既存のaddition項目
    baseDifficulty: number;
    relations: string[];
    category: string;
    layout?: {
      x: number;
      y: number;
    };

    // 新規追加項目（実装支援用）
    implementation_notes?: string[];  // 実装時の注意点・参考情報
    ui_requirements?: string;         // UI/画面要件の簡潔な説明
    data_requirements?: string;       // データ処理・API要件の説明
    acceptance_criteria?: string[];   // 受け入れ基準（必須）
    design_images?: string[];         // 関連する画面設計画像のID（プロジェクトのdesign_imagesから参照）
  };
}
```

### プロジェクトレベルで追加したい項目

```typescript
interface ProjectExtended {
  // 既存項目
  info: {
    // 既存のinfo項目
    github?: {
      organization?: string;
      projectNumber?: number;
      repository?: string;
      trackingIssueNumber?: number;
    };
    name?: string;
    version?: string;
    assignee?: string;

    // info内のaddition項目
    addition?: {
      project_overview?: string;      // プロジェクト概要・目的
      tech_stack?: string[];         // 主要技術スタック
      coding_guidelines?: string;     // コーディング規約・注意点
      deployment_notes?: string;      // デプロイ・環境に関する注意事項
      design_images?: DesignImage[];  // プロジェクト内の画面設計画像
    };
  };
  tasks: Task[];
}
```

## 実装アプローチ

### 1. 事前調査フェーズ
```markdown
Claude Codeでタスク実装を開始する前に以下を実行：

1. **既存コード理解**
   - プロジェクト構造の把握
   - 既存の類似機能の調査
   - 使用技術・ライブラリの確認

2. **仕様確認**
   - タスクの詳細仕様書の確認
   - 不明点の洗い出し
   - 実装方針の決定

3. **設計レビュー**
   - アーキテクチャの整合性確認
   - パフォーマンス影響の評価
   - セキュリティリスクの評価
```

### 2. 実装フェーズ
```markdown
1. **開発環境準備**
   - 必要なツール・ライブラリのインストール
   - 開発サーバーの起動確認

2. **段階的実装**
   - 依存関係の順序に従った実装
   - 単体テストの並行実装
   - コードレビューの実施

3. **統合テスト**
   - 機能テストの実行
   - パフォーマンステストの実行
   - セキュリティテストの実行
```

### 3. 完了確認フェーズ
```markdown
1. **品質チェック**
   - linterによるコード品質確認
   - テストカバレッジの確認
   - 受け入れ基準の確認

2. **ドキュメント更新**
   - API仕様書の更新
   - 実装ドキュメントの作成
   - 運用手順書の更新
```

## 使用方法

### Claude Codeでの実装開始時

```markdown
以下のプロンプトを使用してタスク実装を開始：

「taskgraph-editorの[プロジェクト名]プロジェクトの[タスク名]を実装します。

タスクのaddition情報を確認してください：
1. implementation_notes: 実装時の注意点
2. ui_requirements: 画面・UI要件
3. data_requirements: データ処理要件  
4. acceptance_criteria: 受け入れ基準
5. design_images: 関連する画面設計

プロジェクトのaddition情報も参照してください：
- project_overview: プロジェクト概要
- tech_stack: 技術スタック
- coding_guidelines: 開発ガイドライン
- design_images: 画面設計集

不足している情報があれば教えてください。」
```

### 情報が不足している場合のアプローチ

```markdown
情報が不足している場合は、以下の手順で対応：

1. **既存コードから推測**
   - 類似機能の実装を参考にする
   - 既存のパターンを踏襲する

2. **最小限の実装**
   - 基本機能のみを実装
   - 拡張性を考慮した設計

3. **不明点の明確化**
   - 具体的な質問事項をリストアップ
   - 実装者との確認事項を整理
```

## 期待される効果

この簡素化されたアプローチにより、以下の効果が期待されます：

- **記入負荷の軽減**: 最小限の情報で実装支援が可能
- **実装効率の向上**: Claude Codeが必要な情報を素早く把握
- **画面設計の活用**: 視覚的な情報により正確な実装が可能
- **一貫性の確保**: addition オブジェクトによる統一された情報管理
- **拡張性の維持**: 必要に応じて追加情報を柔軟に拡張可能

---

このプロンプトを参考に、taskgraph-editorの機能拡張と実装プロセスの改善を進めてください。
