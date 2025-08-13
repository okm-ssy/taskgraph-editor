# GitHub Pages 公開計画

## 概要
Taskgraph EditorのViewer機能をGitHub Pagesで公開し、外部からアクセス可能なタスクグラフ閲覧ツールとして提供する。

## 前提条件
- `REFACTOR_PLAN.md`の実装完了
- EditorGridのread-onlyモードが動作している

## 目標
- URLを共有するだけでタスクグラフを他の人に見せられる
- プロジェクトの価値を簡単に伝えられるデモサイト
- 無料でホスティング
- オフライン対応

## 技術仕様

### データ保存方法
- **localStorage使用** - サーバーサイドの複雑さを回避
- **プライバシー保護** - ユーザーのデータがローカルに留まる
- **オフライン対応** - ネットワークなしでも動作

### 機能制限
- **編集機能完全無効** - read-only モードのみ
- **データ永続化なし** - localStorageのみ
- **認証不要** - 静的サイトとして動作

## 実装要件

### 1. Build設定の調整

#### Vite設定 (vite.config.ts)
```typescript
export default defineConfig({
  base: '/taskgraph-editor/', // GitHub Pagesのリポジトリパス
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

#### GitHub Pages用ルーティング
- SPAルーティングのための404.htmlまたはindex.html調整
- Vue Routerのhistory mode設定確認

### 2. 環境変数・設定の調整

#### 本番環境用設定
```typescript
// 本番環境では編集機能を完全無効化
const isProduction = import.meta.env.PROD
const isReadOnly = isProduction || import.meta.env.VITE_READ_ONLY === 'true'
```

#### localStorage設定
```typescript
// デフォルトデータの提供
const DEFAULT_SAMPLE_DATA = {
  info: { name: "サンプルプロジェクト" },
  tasks: [/* サンプルタスク */]
}
```

### 3. UI/UX調整

#### ヘッダーの変更
- "エディター" → "ビューアー" 表記
- 編集関連ボタンの非表示
- GitHub リポジトリリンクの追加

#### データ入力方法
- JSONインポート機能の強化
- ファイルドラッグ&ドロップ対応
- サンプルデータの提供

#### エクスポート機能
- SVGエクスポートの維持
- JSONエクスポート機能の追加（バックアップ用）

### 4. デプロイメント設定

#### GitHub Actions (.github/workflows/deploy.yml)
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_READ_ONLY: 'true'
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 実装手順

### Phase 1: 基本設定
1. Vite設定でGitHub Pages用のbase path設定
2. 環境変数でread-onlyモードの制御
3. ルーティングの調整（SPA対応）

### Phase 2: UI調整  
1. ヘッダー表記の変更
2. 編集機能の完全無効化確認
3. JSONインポート機能の強化

### Phase 3: デプロイ設定
1. GitHub Actions設定
2. GitHub Pagesの有効化
3. カスタムドメイン設定（必要に応じて）

### Phase 4: テスト・最適化
1. 本番環境でのテスト
2. パフォーマンス最適化
3. SEO対応（meta tags等）

## セキュリティ考慮

### データ保護
- localStorageのみ使用（外部送信なし）
- 機密データの扱い注意書き追加
- データクリア機能の提供

### アクセス制御
- 静的サイトのため基本的にオープンアクセス
- robots.txt設定（必要に応じて）

## 運用考慮

### サンプルデータ
- プロジェクトの価値を示すサンプルタスクグラフ
- チュートリアル的な内容
- 複数パターンの提供

### ドキュメント
- 使い方の説明
- JSONフォーマットの説明
- ローカルデータの扱いについて

### 更新・保守
- 定期的なライブラリ更新
- セキュリティアップデート
- 機能追加の検討

## 期待効果

1. **アクセシビリティ向上** - URLを共有するだけでタスクグラフを他の人に見せられる
2. **デモ効果** - プロジェクトの価値を簡単に伝えられる  
3. **コスト効率** - 無料でホスティングできる
4. **技術アピール** - Vue.js + TypeScriptの技術力示せる
5. **コミュニティ貢献** - オープンソースとしての価値向上