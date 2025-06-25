# Taskgraph Editor

JSONでタスクを分解管理するアプリ。schema は apps/frontend/src/model にあります。

## 開発ルール

- ロジック: Pinia (store/) または Composables (composables/) に実装
- コンポーネント: ロジックを持たせない
- 新規作成: `tg create-component <名前>` で自動生成
- 型に any は使わない
- **ハードコード禁止**: マジックナンバーや文字列は `apps/frontend/src/constants/` の定数を使用する

## よく使うコマンド

```sh
# ビルドして開発サーバを立ち上げる
tg run

# linter を実行する
tg lint

# 全ての動作確認テスト (API + MCP)
tg test

# API動作確認テストのみ
tg test-api

# MCPサーバー動作確認テストのみ
tg test-mcp
```

## ディレクトリ構成

- apps/frontend/src/components/editor/ - エディタページ
- apps/frontend/src/components/viewer/ - ビューアページ
- apps/frontend/src/components/common/ - 共通コンポーネント

## Git コミット

指示の実行が完了するたびに以下の手順を実行してください

1. `tg lint` で linter を実行
2. `git add -A` で変更ファイルを追加
3. `git diff --cached` でハードコード確認。見つかれば apps/frontend/src/constants から定数をインポートして置き換え
4. ここまで問題がなければ、変更されたファイルを確認やBashコマンド実行確認なしで自動的にコミット。コミットメッセージ形式：
   - 1行目: `[cc] <type>: <修正内容の概要>`（敬体で記述）
   - 空行
   - ユーザーの指示文字列をそのまま記載
   - 空行
   - 定型フッター
