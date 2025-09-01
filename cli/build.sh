#!/bin/sh

set -e

echo "🔨 全体ビルドを開始します..."
echo ""

# MCPサーバーをビルド
echo "📦 MCPサーバーをビルドしています..."
REPOSITORY_ROOT="$REPOSITORY_ROOT" "${REPOSITORY_ROOT}/cli/mcp/build.sh"

echo ""
echo "✅ 全体ビルドが完了しました"