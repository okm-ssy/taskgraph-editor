# Taskgraph Editor

[![CI](https://github.com/okm-ssy/taskgraph-editor/actions/workflows/CI.yml/badge.svg)](https://github.com/okm-ssy/taskgraph-editor/actions/workflows/CI.yml)
[![Deploy to GitHub Pages](https://github.com/okm-ssy/taskgraph-editor/actions/workflows/CD.yml/badge.svg)](https://github.com/okm-ssy/taskgraph-editor/actions/workflows/CD.yml)

タスクをJSON形式で階層的に管理し、依存関係を視覚的に表現できるWebアプリケーションです。

## 🚀 Live Demo

**読み取り専用版**: [https://okm-ssy.github.io/taskgraph-editor/](https://okm-ssy.github.io/taskgraph-editor/)

※ GitHub Pages版は完全に読み取り専用として動作し、タスクグラフの閲覧とSVGエクスポートが可能です。

## 特徴

### 🤖 AI連携対応（MCP サーバー）

- **Claude Code との完全統合**: MCPサーバーを通じて、Claudeから直接タスクを操作可能
- プロジェクトの作成、タスクの追加・編集・削除をAIアシスタントに依頼できます
- 複雑なタスク構造の設計や依存関係の最適化をAIがサポート

### 📊 視覚的なタスク管理

- タスク間の依存関係を曲線で表示
- ドラッグ&ドロップでタスクを自由に配置
- プロジェクトごとに独立したタスクグラフを管理

### 🔧 主な機能

- **タスク情報の管理**: 名前、説明、難易度、カテゴリー、メモなど
- **依存関係の設定**: タスク間の前後関係を定義
- **2つの表示モード**: 閲覧専用のビューアモードと編集可能なエディタモード
- **GitHub連携**: Issue番号との紐付けが可能
- **データの永続化**: JSONファイルとして保存され、いつでも再利用可能

## セットアップ

### コマンドのセットアップ

`tg` コマンドを使用するために、bin ディレクトリにPATHを通します：

```bash
# ~/.bashrc または ~/.zshrc に追加
export PATH="$PATH:/path/to/taskgraph-editor/bin"

# 設定を反映
source ~/.bashrc  # または source ~/.zshrc
```

### 新規プロジェクトの作成

```bash
# 新しいプロジェクトを作成
tg create-project <プロジェクト名>

# 例
tg create-project my-new-project
```

プロジェクト名には英数字、ハイフン、アンダースコアのみ使用できます。

## 起動方法

### 開発サーバーの起動

```bash
# PATHを通した後はどこからでも実行可能
tg run
```

ブラウザで <http://localhost:5353> にアクセスしてください。

## よく使うコマンド

```bash
# VS Codeで開く
tg edit

# 開発サーバーを起動
tg run

# APIサーバーを停止
tg stop

# Storybookを起動
tg storybook

# コードの品質チェック（フロントとMCPサーバー）
tg lint

# 全ての動作確認テスト（API + MCP）
tg test

# API動作確認テストのみ
tg test-api

# MCPサーバー動作確認テストのみ
tg test-mcp

# Vueコンポーネントとストーリーファイルを作成
tg create-component <コンポーネント名>

# AIプロンプト用にファイルを結合
tg create-prompt-context

# 新しいプロジェクトを作成
tg create-project <プロジェクト名>

# MCPサーバーを開発モードで起動
tg mcp-run

# MCPサーバーをビルド
tg mcp-build
```

## トラブルシューティング

### MCPサーバーが動作しない場合

1. Node.jsがインストールされているか確認
2. MCPサーバーのビルドが完了しているか確認：

   ```bash
   cd apps/mcp-server
   npm install
   npm run build
   ```

3. Claude Desktopの設定パスが正しいか確認

### タスクが保存されない場合

- APIサーバーが起動しているか確認（ポート9393）
- `data/`ディレクトリに書き込み権限があるか確認

### タスクカテゴリー設定

タスクカテゴリーと難易度の対応は `apps/frontend/public/task-categories.tsv` で管理されています。
このファイルはタブ区切り形式で、各行に「カテゴリー名」と「基準難易度」を記載します。

```tsv
親タスク	0.00
ruby - API 追加	3.00
vue - UI 変更	1.00
```

このファイルが存在しない場合、カテゴリー選択時の自動補完と難易度の自動設定が機能しません。
