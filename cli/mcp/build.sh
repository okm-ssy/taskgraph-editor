#!/bin/sh

set -eu

mcp_build() {
  cd "${REPOSITORY_ROOT}/apps/mcp-server/"
  npm set progress=false
  npm i
  npm run build
  
  # ビルド成功後の案内を表示
  if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MCPサーバーのビルドが完了しました！"
    echo ""
    echo "📋 Claude Codeに登録するには以下のコマンドを実行してください："
    echo ""
    echo "  claude mcp add taskgraph node ${REPOSITORY_ROOT}/apps/mcp-server/dist/index.js"
    echo ""
    echo "📋 登録確認："
    echo ""
    echo "  claude mcp list"
    echo ""
    echo "📋 削除したい場合："
    echo ""
    echo "  claude mcp remove taskgraph"
    echo ""
    echo "💡 Claude Codeで以下のように質問してテストできます："
    echo "   「タスクグラフの全タスクを表示して」"
    echo ""
  fi
}

mcp_build "$@"