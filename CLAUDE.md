# Taskgraph Editor

## 概要

タスクグラフという、タスクを分解して指定の schema で保存するための仕組みを扱います。
実体は json で、その json を管理するためのアプリです。
具体的な schema は <apps/frontend/src/model> にあります。

ロジックは Pinia を使って <apps/frontend/src/store> に実装してください。
もしくは provide-injection を使う場合は <apps/frontend/src/composables> に実装してください。
コンポーネントにはロジックを持たせたくないです。

コンポーネントを新規作成するときは CLI コマンドの `tg create-component <コンポーネント名>` で実行してください。
apps/frontend/src/template/component.vue.hbs から <コンポーネント名>.vue が作られます。

## コンポーネント構成

- エディタページ <apps/frontend/src/components/editor>
- ビューアページ <apps/frontend/src/components/viewer>
- 共通コンポーネント <apps/frontend/src/components/common>

## Git コミット方針

タスクが完了するたびに git commit を作成してください。
Claude Code によるコミットであることを明示したいので、先頭に `[cc]` と入れてください。
コミットメッセージは変更内容を簡潔に説明し、敬体にしてください：

- `[cc] feat: 新機能の追加`
- `[cc] fix: バグ修正`
- `[cc] refactor: リファクタリング`
- `[cc] style: スタイル・UI調整`
- `[cc] chore: その他の変更`

例：
- `[cc] feat: タスク依存をドラッグ&ドロップで実装します`
- `[cc] fix: 矢印の位置がずれている問題を修正しました`
- `[cc] refactor: 不要なコードを削除し、最適化しました`
