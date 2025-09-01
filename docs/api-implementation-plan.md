# API実装計画

## 概要
MCPサーバーに加えて、api-serverのAPIを直接実行できる仕組みを実装する。TypeSpecを使用してAPI定義を記述し、開発者が使いやすいCLIコマンドを提供する。

## 実装内容

### 1. TypeSpecの導入
- **目的**: API定義を型安全に記述し、OpenAPIなど複数形式に出力可能にする
- **配置場所**:
  ```
  apps/api-server/
  ├── src/
  ├── typespec/
  │   ├── main.tsp       # エントリポイント
  │   ├── models.tsp     # データモデル定義
  │   ├── tasks.tsp      # タスク関連API定義
  │   └── errors.tsp     # エラー定義
  └── generated/
      └── openapi.json    # TypeSpecから生成
  ```

### 2. CLIコマンドの実装

#### `tg api info`
- **機能**: 利用可能なAPIエンドポイントの一覧と詳細を表示
- **出力内容**:
  - エンドポイントのパスとHTTPメソッド
  - 各エンドポイントの説明
  - 必須/オプションのパラメータ
  - リクエストボディのスキーマ
  - 使用例

#### `tg api call`
- **機能**: APIエンドポイントを直接実行
- **使用方法**:
  ```bash
  tg api call GET /projects
  tg api call POST /projects/:id/tasks '{"name":"task1","description":"説明"}'
  ```
- **特徴**:
  - サーバーURLは内部で管理（環境に応じて自動切り替え）
  - curlと異なり、承認不要で実行可能
  - レスポンスフォーマットオプション（--json, --pretty, --raw）

### 3. エラーメッセージの構造化

#### エラーレスポンス形式
```typescript
interface ApiError {
  code: string;           // エラーコード（例: "TASK_NOT_FOUND"）
  message: string;        // ユーザー向けメッセージ
  details?: {            // デバッグ用詳細情報
    taskName?: string;
    projectId?: string;
    validationErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
  timestamp: string;      // エラー発生時刻
  requestId: string;      // リクエスト追跡用ID
}
```

#### エラーコード体系
- `TASK_NOT_FOUND`: タスクが見つからない
- `PROJECT_NOT_FOUND`: プロジェクトが見つからない
- `VALIDATION_ERROR`: バリデーションエラー
- `DUPLICATE_TASK`: タスク名が重複
- `CIRCULAR_DEPENDENCY`: 循環依存を検出
- `INTERNAL_ERROR`: 内部エラー

### 4. APIエンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /projects | プロジェクト一覧取得 |
| GET | /projects/:id | プロジェクトのタスクグラフ取得 |
| GET | /projects/:id/tasks/:name | 特定タスク取得 |
| POST | /projects/:id/tasks | タスク作成 |
| PUT | /projects/:id/tasks/:name | タスク更新 |
| DELETE | /projects/:id/tasks/:name | タスク削除 |
| PATCH | /projects/:id/tasks/:name/notes | ノート更新 |
| PATCH | /projects/:id/tasks/:name/implementation | 実装メモ更新 |
| PATCH | /projects/:id/tasks/:name/requirements | 要件更新 |

### 5. 実装順序

1. **TypeSpec環境構築**
   - TypeSpecのインストール
   - 基本設定ファイルの作成
   - ビルドスクリプトの追加

2. **API定義作成**
   - モデル定義（Task, Project, Error）
   - エンドポイント定義
   - OpenAPI生成の確認

3. **CLIコマンド実装**
   - `tg api info`: TypeSpec定義からエンドポイント情報を表示
   - `tg api call`: HTTPリクエストを実行してレスポンスを表示

4. **APIサーバー改修**
   - エラーハンドリングの統一
   - 構造化エラーレスポンスの実装
   - バリデーションメッセージの改善

5. **テスト追加**
   - APIエンドポイントのテスト
   - エラーケースのテスト
   - CLIコマンドのテスト

### 6. 設計方針

- **John Carmack流**: シンプルで直接的な実装
- **Robert C. Martin流**: クリーンなエラーハンドリング
- **Rob Pike流**: 明確で予測可能なインターフェース
- **型安全性**: TypeSpecによる厳密な型定義
- **テスタビリティ**: 構造化エラーによる自動テストの容易化

### 7. CLAUDE.mdへの追記内容

```markdown
## API実行

```bash
# API情報を表示
tg api info

# APIを直接実行
tg api call GET /projects
tg api call POST /projects/myproject/tasks '{"name":"task1","description":"タスク説明"}'
```
```

### 8. 今後の拡張可能性

- WebSocket対応（リアルタイム更新）
- バッチAPI（複数操作の一括実行）
- GraphQL対応
- 認証・認可機能
- レート制限
- APIバージョニング
