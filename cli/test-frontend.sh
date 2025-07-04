#!/bin/bash

# フロントエンドテストスクリプト
echo "🧪 フロントエンドビルドテスト"
echo "============================"

# プロジェクトルートに移動
cd "${REPOSITORY_ROOT}/apps/frontend/"

echo "📦 依存関係インストール..."
npm set progress=false
npm i

echo ""
echo "🔧 TypeScriptビルドテスト..."
if npm run build; then
    echo "✅ フロントエンドビルド: 成功"
    exit 0
else
    echo "❌ フロントエンドビルド: 失敗"
    exit 1
fi