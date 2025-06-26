#!/bin/sh

set -eu

stop() {
  PID_FILE="${REPOSITORY_ROOT}/.api-server.pid"
  
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "APIサーバー (PID: $PID) を停止中..."
      kill "$PID"
      rm "$PID_FILE"
      echo "APIサーバーを停止しました"
    else
      echo "APIサーバーは既に停止しています"
      rm "$PID_FILE"
    fi
  else
    echo "APIサーバーのPIDファイルが見つかりません"
  fi
}

stop "$@"