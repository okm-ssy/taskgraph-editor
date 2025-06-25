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

  # フロントエンドを起動（フォアグラウンド）
  npm run dev
}

run "$@"
