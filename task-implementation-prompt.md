# Claude Code向け タスク実装指示書

この指示書は、taskgraph-editorで管理されているタスクを実装する際に、Claude Codeが従うべき情報解釈ルールと実装手順を定義します。

## Claude Codeの実装指示

### 必須実行ルール

1. **タスク実装前に必ずaddition情報を確認せよ**
2. **プロジェクトのaddition情報で全体方針を把握せよ**
3. **画面設計画像がある場合は必ず参照し、正確な実装を行え**
4. **acceptance_criteriaを満たすまで実装完了と判断するな**

### addition情報の解釈と活用ルール

#### タスクレベル（task.addition）
- **implementation_notes**: 実装前に必読し、技術選択・アーキテクチャ判断に反映せよ
- **ui_requirements**: UI実装時の仕様として厳密に従え
- **data_requirements**: API設計・データベース処理の要件として実装せよ
- **acceptance_criteria**: 実装完了の判定基準として最優先で満たせ
- **design_images**: 指定された画像IDの画面設計を参照し、デザインに合致する実装を行え

#### プロジェクトレベル（info.addition）
- **project_overview**: プロジェクト全体の目的・方向性を理解し、実装方針を決定せよ
- **tech_stack**: 指定された技術スタックを必ず使用せよ
- **coding_guidelines**: コーディング規約として厳格に遵守せよ
- **deployment_notes**: 環境固有の制約・設定を実装に反映せよ
- **design_images**: プロジェクト全体の画面設計として参照可能

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

## Claude Code実装手順

### 段階1: 情報収集・分析
```markdown
1. **addition情報の収集**
   - task.additionの全項目を確認
   - info.additionのプロジェクト情報を確認
   - design_imagesが指定されている場合は画像を読み込み

2. **既存コード分析**
   - プロジェクト構造を把握
   - 類似機能の実装パターンを調査
   - coding_guidelinesに従うべき規約を特定

3. **実装方針決定**
   - tech_stackの制約内で技術選択
   - ui_requirements・data_requirementsを実装仕様に変換
   - implementation_notesの制約・注意点を実装計画に反映
```

### 段階2: 実装実行
```markdown
1. **コア機能実装**
   - data_requirementsに基づくAPI・データ処理
   - ui_requirementsに基づく画面・UI実装
   - design_imagesと一致するビジュアル実装

2. **品質確保**
   - coding_guidelinesに準拠したコード記述
   - 既存パターンとの整合性確保
   - deployment_notesの環境制約に対応

3. **段階的検証**
   - 各機能の動作確認
   - acceptance_criteriaとの照合
   - 統合動作の確認
```

### 段階3: 完了確認
```markdown
1. **acceptance_criteria完全準拠確認**
   - 全ての受け入れ基準を満たしているか検証
   - 不足がある場合は追加実装

2. **品質最終チェック**
   - linter・テスト実行
   - design_imagesとの視覚的一致確認
   - 既存機能への影響確認

3. **実装完了報告**
   - 実装内容の要約
   - acceptance_criteriaの達成状況報告
   - 今後の拡張ポイントの提示
```

## 実装開始コマンド

### ユーザーからの指示例
```markdown
「taskgraph-editorの[プロジェクト名]プロジェクトの[タスク名]を実装してください」
```

### Claude Codeの応答テンプレート
```markdown
承知しました。[タスク名]を実装します。

まず、以下の情報を確認します：

**タスク情報（task.addition）:**
- implementation_notes: [内容確認]
- ui_requirements: [内容確認] 
- data_requirements: [内容確認]
- acceptance_criteria: [内容確認]
- design_images: [画像ID確認・読み込み]

**プロジェクト情報（info.addition）:**
- project_overview: [内容確認]
- tech_stack: [技術制約確認]
- coding_guidelines: [規約確認]
- deployment_notes: [環境制約確認]

[不足情報がある場合は具体的に質問]

確認完了後、上記の実装手順に従って段階的に実装を進めます。
```

### 情報不足時の対応指示

```markdown
Claude Codeは以下の優先順位で対応せよ：

1. **既存コードパターンの踏襲**
   - 類似機能の実装方法を採用
   - プロジェクトの慣例に従う

2. **conservative実装**
   - 安全で拡張しやすい実装を選択
   - 過度に複雑な実装は避ける

3. **明示的な確認要求**
   - 実装判断に必要な情報を具体的に質問
   - 選択肢を提示して判断を求める
```

## 成功基準

以下を満たした場合にタスク実装成功とする：

- **acceptance_criteria完全達成**: 全ての受け入れ基準を満たす
- **design_images準拠**: 画面設計と視覚的に一致する
- **既存コード整合性**: プロジェクトのパターン・規約に準拠
- **動作確認完了**: 実装機能が正常に動作する

---

このプロンプトを参考に、taskgraph-editorの機能拡張と実装プロセスの改善を進めてください。
