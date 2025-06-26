#!/bin/sh

set -eu

run() {
  # APIサーバーを起動
  cd "${REPOSITORY_ROOT}/apps/api-server/"
  npm set progress=false
  npm i
  npm start &
  API_SERVER_PID=$!

  # フロントエンドを起動
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm set progress=false
  npm i

  # APIサーバーのPIDを保存
  echo $API_SERVER_PID >"${REPOSITORY_ROOT}/.api-server.pid"

  # Ctrl+C時にAPIサーバーも停止するトラップを設定
  trap 'echo ""; echo "APIサーバーを停止中..."; kill $API_SERVER_PID 2>/dev/null; rm -f "${REPOSITORY_ROOT}/.api-server.pid"; exit 0' INT

  # フロントエンドを起動（フォアグラウンド）
  npm run dev
}

run "$@"
