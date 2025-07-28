# タスクグラフスキーマ仕様

タスクグラフエディタで使用されるデータスキーマの詳細説明です。

## 概要

タスクグラフは、タスクの依存関係を管理し、プロジェクトの進行を可視化するためのデータ構造です。
主にフロントエンド用とMCPサーバー用の2つのスキーマバリエーションが存在します。

## 主要なスキーマ定義

### 1. タスクスキーマ (Task)

個々のタスクを表現するスキーマです。

```typescript
{
  name: string,              // タスク名（空白文字を含まない一意の文字列）
  description: string,       // タスクの説明
  difficulty: number,        // 表示用の難易度（baseDifficultyの1.2倍）
  depends: string[],         // 依存するタスク名の配列
  notes: string[],          // メモの配列
  issueNumber?: number,     // GitHub Issue番号（オプション）
  addition?: {              // 追加情報（オプション）
    baseDifficulty: number, // 入力時の基本難易度
    category: string,       // カテゴリ
    relations: string[],    // 関連ファイルパス
    layout?: {              // レイアウト情報
      x: number,
      y: number
    }
  }
}
```

**バリデーションルール:**
- `name`: 空白文字を含まない必須文字列
- `depends`: 重複と空文字列を除外
- `difficulty`: 0以上の数値（自動計算される）
- `baseDifficulty`: 0以上の数値（ユーザー入力値）

### 2. タスクグラフスキーマ (Taskgraph)

タスクの集合とプロジェクト情報を含む最上位のスキーマです。

```typescript
{
  info: {                          // プロジェクト情報
    name?: string,                 // プロジェクト名
    version?: string,              // バージョン
    assignee?: string,             // 担当者
    github?: {                     // GitHub連携情報
      organization?: string,       // 組織名
      repository?: string,         // リポジトリ名
      projectNumber?: number,      // プロジェクト番号
      trackingIssueNumber?: number // トラッキングIssue番号
    }
  },
  tasks: Task[]                    // タスクの配列
}
```

**バリデーションルール:**
- タスク名の重複は禁止
- 循環依存の検出機能あり

### 3. MCPサーバー拡張スキーマ

MCPサーバーでは実装支援のための追加フィールドが利用可能です。

```typescript
addition: {
  // 基本フィールド（上記と同じ）
  baseDifficulty: number,
  category: string,
  relations: string[],

  // MCP専用の実装支援フィールド
  requirements?: string[],           // 受け入れ条件
  ui_requirements?: string,          // UI要件
  api_schemas?: string[],            // API仕様・エンドポイント情報
  implementation_notes?: string[],   // 実装メモ
  design_images?: string[]          // デザイン画像URL
}
```

### 4. プロジェクトレベルの拡張スキーマ

プロジェクト全体の実装方針を定義するための拡張フィールドです。

```typescript
info: {
  // 既存フィールド
  name?: string,
  version?: string,
  assignee?: string,
  github?: {...},
  
  // プロジェクトレベルの実装支援フィールド
  addition?: {
    project_overview?: string,      // プロジェクト概要・目的
    tech_stack?: string[],         // 主要技術スタック
    coding_guidelines?: string,     // コーディング規約・注意点
    deployment_notes?: string,      // デプロイ・環境に関する注意事項
    design_images?: DesignImage[]   // プロジェクト内の画面設計画像
  }
}
```

**DesignImage型定義:**
```typescript
interface DesignImage {
  id: string;          // 画像の一意ID
  title: string;       // 画像のタイトル・説明
  filepath: string;    // 画像ファイルのパス
  tags?: string[];     // 検索用タグ（画面名、機能名等）
}
```

### 5. エディタ用グリッドタスクスキーマ

ビジュアルエディタでの表示位置を管理します。

```typescript
{
  i: string,  // 一意のID
  x: number,  // X座標（グリッド単位）
  y: number,  // Y座標（グリッド単位）
  w: number,  // 幅（グリッド単位）
  h: number   // 高さ（グリッド単位）
}
```

## 難易度の計算

- **baseDifficulty**: ユーザーが入力する基本難易度
- **difficulty**: 表示・保存される難易度（baseDifficulty × 1.2）
- この仕組みにより、依存関係による難易度の自動調整が可能

## データ検証機能

1. **タスク名の一意性チェック**: 同じ名前のタスクは作成不可
2. **循環依存の検出**: `detectCycles`関数により循環参照を防止
3. **空文字列の除外**: 依存関係から空文字列を自動除去
4. **型安全性**: Zodによる実行時型検証

## Claude Code向け実装指示

### 実装時の必須ルール

1. **タスク実装前に必ずaddition情報を確認**
2. **プロジェクトのaddition情報で全体方針を把握**
3. **画面設計画像がある場合は必ず参照し、正確な実装を実行**
4. **requirementsを満たすまで実装完了と判断しない**

### フィールドの活用方法

**タスクレベル (task.addition):**
- `implementation_notes`: 実装前に必読、技術選択の参考に
- `ui_requirements`: UI実装仕様として厳密に従う
- `api_schemas`: API設計・データ処理の要件として実装
- `requirements`: 実装完了の判定基準（最優先）
- `design_images`: 指定画像IDの画面設計を参照

**プロジェクトレベル (info.addition):**
- `project_overview`: プロジェクト全体の目的・方向性を理解
- `tech_stack`: 指定された技術スタックを必ず使用
- `coding_guidelines`: コーディング規約として厳格に遵守
- `deployment_notes`: 環境固有の制約・設定を実装に反映

## 使用例

```json
{
  "info": {
    "name": "タスクグラフエディタ開発",
    "version": "1.0.0",
    "assignee": "開発チーム",
    "addition": {
      "project_overview": "タスク管理の可視化ツール",
      "tech_stack": ["Vue 3", "TypeScript", "Pinia"],
      "coding_guidelines": "CLAUDE.mdに準拠"
    }
  },
  "tasks": [
    {
      "name": "design-ui",
      "description": "UIデザインの作成",
      "difficulty": 3.6,
      "depends": [],
      "notes": ["Figmaで作成"],
      "addition": {
        "baseDifficulty": 3,
        "category": "デザイン",
        "relations": ["design/mockup.fig"],
        "requirements": [
          "レスポンシブ対応",
          "ダークモード対応"
        ],
        "ui_requirements": "Material Design準拠"
      }
    }
  ]
}
```
