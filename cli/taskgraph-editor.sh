#!/bin/sh

set -e

taskgraph_editor() {
  repository_root=$(
    cd "$(dirname "$0")"/..
    pwd
  )

  script_name=''
  subcommand=$1
  [ $# -gt 0 ] && shift
  case $subcommand in
  edit)
    script_name='edit.sh'
    ;;
  lint)
    script_name='front/lint.sh'
    ;;
  run)
    script_name='front/run.sh'
    ;;
  stop)
    script_name='stop.sh'
    ;;
  storybook)
    script_name='front/storybook.sh'
    ;;
  create_component | create-component)
    script_name='front/create_component.sh'
    ;;
  create_prompt_context | create-prompt-context)
    script_name='front/create_prompt_context.sh'
    ;;
  mcp-run)
    script_name='mcp/run.sh'
    ;;
  mcp-build)
    script_name='mcp/build.sh'
    ;;
  test)
    script_name='test.sh'
    ;;
  test-api)
    script_name='test-api.sh'
    ;;
  test-mcp)
    script_name='test-mcp.sh'
    ;;
  *)
    help && return
    ;;
  esac

  command="${repository_root}/cli/${script_name}"

  REPOSITORY_ROOT="$repository_root" \
    "$command" "$@"
}

help() {
  cat <<-END 1>&2

  edit                          vs-code で開く
  run                           フロントを立ち上げる
  stop                          APIサーバーを停止する
  lint                          フロントとMCPサーバーのlintを実行
  test                          全ての動作確認テストを実行（API + MCP）
  test-api                      API動作確認テストを実行
  test-mcp                      MCPサーバー動作確認テストを実行
  create-component              フロントの vue ファイルと stories ファイルを作る
  create-prompt-context         AI のプロンプト用にファイルを結合する
  mcp-run                       MCPサーバーを開発モードで起動
  mcp-build                     MCPサーバーをビルド
  help                          ヘルプを表示する
END
}

taskgraph_editor "$@"
