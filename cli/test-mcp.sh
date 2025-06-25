#!/bin/bash

# MCPサーバーテストスクリプト
# プロジェクトルートに移動
cd "${REPOSITORY_ROOT}"

echo "🧪 MCPサーバー動作確認テスト"
echo "=============================="

MCP_SERVER_PATH="./apps/mcp-server/dist/index.js"

# ビルド確認
echo "🔧 ビルド状況確認..."
if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "❌ MCPサーバーがビルドされていません"
    echo "💡 'tg mcp-build' を実行してください"
    exit 1
fi
echo "✅ MCPサーバービルド済み"

# データディレクトリ確認
echo ""
echo "📁 データディレクトリ確認..."
if [ ! -d "./data" ]; then
    echo "❌ dataディレクトリが存在しません"
    exit 1
fi

echo "📊 プロジェクトファイル一覧:"
ls -la ./data/*.taskgraph.json 2>/dev/null || echo "  プロジェクトファイルがありません"

# MCPサーバーの基本テスト（stdin/stdout）
echo ""
echo "🔍 MCPサーバー基本動作テスト..."

# プロジェクト一覧取得テスト
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "taskgraph_list_projects", "arguments": {}}}' | timeout 5s node "$MCP_SERVER_PATH" 2>/dev/null | grep -q "jsonrpc"

if [ $? -eq 0 ]; then
    echo "✅ MCPサーバー基本動作OK"
else
    echo "❌ MCPサーバー基本動作エラー"
fi

# Claude Code MCP登録状況確認
echo ""
echo "🔗 Claude Code MCP登録状況..."
if command -v claude &> /dev/null; then
    registered=$(claude mcp list 2>/dev/null | grep -c "taskgraph" || echo "0")
    if [ "$registered" -gt 0 ]; then
        echo "✅ Claude CodeにMCPサーバー登録済み"
    else
        echo "📋 Claude CodeにMCPサーバー未登録"
        echo "💡 登録コマンド:"
        echo "   claude mcp add taskgraph node $PWD/$MCP_SERVER_PATH"
    fi
else
    echo "📋 Claude Codeコマンドが見つかりません"
fi

echo ""
echo "✅ MCPサーバーテスト完了"
echo ""
echo "💡 利用可能な機能："
echo "  - taskgraph_list_projects: プロジェクト一覧取得"
echo "  - taskgraph_get_taskgraph: プロジェクトのタスクグラフ取得"
echo "  - taskgraph_get_task: 個別タスク取得"
echo "  - taskgraph_create_task: タスク新規作成"
echo "  - taskgraph_update_task: タスク更新"
echo "  - taskgraph_delete_task: タスク削除"