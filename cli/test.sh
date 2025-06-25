#!/bin/bash

# 統合テストスクリプト
echo "🧪 Taskgraph Editor 統合テスト"
echo "=============================="

# プロジェクトルートに移動
cd "${REPOSITORY_ROOT}"

echo ""
echo "🔧 API動作確認テスト実行中..."
echo "------------------------------"
if ./cli/test-api.sh; then
    echo "✅ APIテスト: 成功"
    API_TEST_SUCCESS=true
else
    echo "❌ APIテスト: 失敗"
    API_TEST_SUCCESS=false
fi

echo ""
echo "🔧 MCPサーバー動作確認テスト実行中..."
echo "------------------------------------"
if ./cli/test-mcp.sh; then
    echo "✅ MCPテスト: 成功"
    MCP_TEST_SUCCESS=true
else
    echo "❌ MCPテスト: 失敗"
    MCP_TEST_SUCCESS=false
fi

echo ""
echo "📊 テスト結果サマリー"
echo "===================="
if [ "$API_TEST_SUCCESS" = true ] && [ "$MCP_TEST_SUCCESS" = true ]; then
    echo "🎉 全てのテストが成功しました！"
    exit 0
else
    echo "⚠️  一部のテストが失敗しました："
    if [ "$API_TEST_SUCCESS" = false ]; then
        echo "  - APIテスト: 失敗"
    fi
    if [ "$MCP_TEST_SUCCESS" = false ]; then
        echo "  - MCPテスト: 失敗"
    fi
    exit 1
fi