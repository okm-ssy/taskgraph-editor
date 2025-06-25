#!/bin/bash

# APIテストスクリプト
API_BASE="http://localhost:3333"

# プロジェクトルートに移動
cd "${REPOSITORY_ROOT}"

echo "🧪 API動作確認テスト"
echo "===================="

# サーバーが起動しているかチェック
echo "📡 サーバー接続確認..."
if ! curl -s --connect-timeout 3 "$API_BASE" > /dev/null; then
    echo "❌ APIサーバーが起動していません (port 3333)"
    exit 1
fi
echo "✅ APIサーバー接続OK"

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

echo ""
echo "✅ APIテスト完了"