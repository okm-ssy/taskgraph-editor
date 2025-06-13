# Taskgraph Editor

JSONでタスクを分解管理するアプリ。schema は apps/frontend/src/model にあります。

## 開発ルール

- ロジック: Pinia (store/) または Composables (composables/) に実装
- コンポーネント: ロジックを持たせない
- 新規作成: `tg create-component <名前>` で自動生成

## よく使うコマンド

```sh
# 開発サーバを立ち上げる
tg run
```

## ディレクトリ構成

- apps/frontend/src/components/editor/ - エディタページ
- apps/frontend/src/components/viewer/ - ビューアページ
- apps/frontend/src/components/common/ - 共通コンポーネント

## Git コミット

**自動コミット**: 指示の実行が完了するたびに、変更されたファイルを自動的にコミットしてください。

ファイルに変更があるたびに、以下の形式でコミットしてください。
指示も含んでください。
`[cc] <type>: <内容>` で敬体。例：`[cc] feat: ドラッグ&ドロップ機能を追加します`
