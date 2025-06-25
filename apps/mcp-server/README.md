# Taskgraph MCP Server

Taskgraph EditorのためのMCP (Model Context Protocol) サーバーです。

## 概要

このMCPサーバーは、LLM（Claude等）がTaskgraph Editorのタスクデータを読み取り、操作できるようにします。

## 機能

### 基本的なCRUD操作

- `taskgraph_list_tasks` - 全タスクの一覧取得
- `taskgraph_get_task` - 特定タスクの取得
- `taskgraph_create_task` - 新規タスクの作成
- `taskgraph_update_task` - タスクの更新
- `taskgraph_delete_task` - タスクの削除

## セットアップ

### 1. 依存関係のインストール

```bash
cd apps/mcp-server
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. データの連携

MCPサーバーは `~/.taskgraph/taskgraph-data.json` ファイルを読み書きします。

フロントエンドアプリケーションで「Export」ボタンをクリックし、ダウンロードされたJSONファイルを上記の場所に配置してください。

## Claude Desktopでの使用方法

### 1. 設定ファイルの編集

Claude Desktopの設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "taskgraph": {
      "command": "node",
      "args": ["/path/to/taskgraph-editor/apps/mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを再起動してください。

## 使用例

Claudeで以下のようなリクエストができます：

```
タスクグラフのすべてのタスクを見せて
```

```
"backend-setup"というタスクの詳細を教えて
```

```
新しいタスク"frontend-testing"を作成して。説明は"フロントエンドのテストを実装"、難易度は3で。
```

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

### 型定義

タスクの型定義は `src/types.ts` にあります。フロントエンドの型定義と同期を保つ必要があります。

## トラブルシューティング

### データが見つからない場合

1. フロントエンドでデータをエクスポートしたか確認
2. `~/.taskgraph/taskgraph-data.json` が存在するか確認
3. ファイルの権限を確認

### MCPサーバーが認識されない場合

1. Claude Desktopの設定ファイルのパスが正しいか確認
2. `dist/index.js` が存在するか確認（ビルドを実行）
3. Claude Desktopのログを確認