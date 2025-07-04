#!/bin/sh

set -eu

lint() {
  echo "🧪 フロントエンドlint & ビルドテスト"
  echo "=================================="
  
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm set progress=false
  npm i
  
  echo "🔧 ESLint実行..."
  npm run lint
  
  echo ""
  echo "🔧 TypeScriptビルドテスト..."
  npm run build

  echo ""
  echo "🧪 APIサーバーlint"
  echo "==================="
  cd "${REPOSITORY_ROOT}/apps/api-server/"
  npm set progress=false
  npm i
  
  echo "🔧 ESLint実行..."
  npm run lint
  
  echo ""
  echo "🔧 構文チェック..."
  npm run test

  echo ""
  echo "🧪 MCPサーバーlint"
  echo "==================="
  cd "${REPOSITORY_ROOT}/apps/mcp-server/"
  npm set progress=false
  npm i
  npm run lint
}

lint "$@"
