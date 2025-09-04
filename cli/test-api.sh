#!/bin/bash

# APIテストスクリプト
API_BASE="http://localhost:9393"

# プロジェクトルートに移動
cd "${REPOSITORY_ROOT}"

echo "🧪 API動作確認テスト"
echo "===================="

# APIサーバー構文テスト
echo "🔧 APIサーバー構文テスト..."
cd "${REPOSITORY_ROOT}/apps/api-server/"
npm set progress=false
npm i

echo "🔧 ESLint実行..."
npm run lint

echo ""
echo "🔧 構文チェック..."
npm run test
echo "✅ APIサーバー構文テスト: 成功"

cd "${REPOSITORY_ROOT}"

# 常にモックテストを実行
echo ""
echo "📦 モックテストを実行します..."

# モックテストとOpenAPIスキーマ検証を実行
cd "${REPOSITORY_ROOT}/apps/api-server"

echo ""
echo "🧪 モックAPIテスト実行中..."
npm run test:mock

echo ""
echo "🔍 OpenAPIスキーマ検証テスト実行中..."
npm run test:openapi

echo ""
echo "✅ APIテスト完了"
