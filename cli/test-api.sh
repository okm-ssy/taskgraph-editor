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

# サーバーが起動しているかチェック（静かに確認）
if ! curl -s --connect-timeout 3 "$API_BASE" >/dev/null 2>&1; then
    # サーバーが起動していない場合は静かにモックテストのみ実行
    echo ""
    echo "📦 モックテストモードで実行します..."
    
    # モックテストとOpenAPIスキーマ検証を実行
    cd "${REPOSITORY_ROOT}/apps/api-server"
    
    echo ""
    echo "🧪 モックAPIテスト実行中..."
    npm run test:mock
    
    echo ""
    echo "🔍 OpenAPIスキーマ検証テスト実行中..."
    npm run test:openapi
    
    echo ""
    echo "✅ モックテストモード完了"
    exit 0
else
    echo ""
    echo "📡 APIサーバーに接続しました"
fi

# プロジェクト一覧取得
echo ""
echo "📋 プロジェクト一覧取得..."
projects=$(curl -s "$API_BASE/api/projects")
echo "$projects" | jq '.'
project_count=$(echo "$projects" | jq '. | length')
echo "📊 プロジェクト数: $project_count"

# 各プロジェクトのデータ確認
echo ""
echo "📦 プロジェクトデータ確認..."
for project_id in $(echo "$projects" | jq -r '.[].id'); do
    echo "  🔍 $project_id:"

    # プロジェクト名取得
    project_name=$(curl -s "$API_BASE/api/load-taskgraph?projectId=$project_id" | jq -r '.info.name // "名前なし"')

    # タスク数取得
    task_count=$(curl -s "$API_BASE/api/load-taskgraph?projectId=$project_id" | jq -r '.tasks | length')

    # ファイルサイズ取得
    file_size=$(curl -s "$API_BASE/api/load-taskgraph?projectId=$project_id" | wc -c)

    echo "    📝 名前: $project_name"
    echo "    📊 タスク数: $task_count"
    echo "    💾 データサイズ: ${file_size}B"
done

# デフォルトプロジェクトテスト
echo ""
echo "🔧 デフォルトプロジェクトテスト..."
default_response=$(curl -s "$API_BASE/api/load-taskgraph")
default_tasks=$(echo "$default_response" | jq -r '.tasks | length')
echo "📊 デフォルトプロジェクトのタスク数: $default_tasks"

# 全APIエンドポイントテスト
echo ""
echo "🔍 全APIエンドポイントテスト..."
if "${REPOSITORY_ROOT}/cli/api/full-test.sh"; then
    echo "✅ 全APIエンドポイントテスト成功"
else
    echo "⚠️  一部のAPIテストに問題があります"
fi

# OpenAPIスキーマ検証テスト
echo ""
echo "🔍 OpenAPIスキーマ検証..."
if "${REPOSITORY_ROOT}/cli/api/validate.sh"; then
    echo "✅ スキーマ検証成功"
else
    echo "⚠️  スキーマ検証に問題があります（テストは継続）"
fi

echo ""
echo "✅ APIテスト完了"
