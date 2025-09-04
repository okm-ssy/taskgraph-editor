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
  build)
    script_name='build.sh'
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
  create_project | create-project)
    script_name='create-project.sh'
    ;;
  mcp-run)
    script_name='mcp/run.sh'
    ;;
  test)
    script_name='test.sh'
    ;;
  test-api)
    script_name='test-api.sh'
    ;;
  test-frontend)
    script_name='test-frontend.sh'
    ;;
  test-mcp)
    script_name='test-mcp.sh'
    ;;
  api)
    # apiサブコマンドの処理
    case $1 in
      info)
        shift
        script_name='api/info.sh'
        ;;
      call)
        script_name='api/call.sh'
        ;;
      build)
        shift
        script_name='api/build.sh'
        ;;
      *)
        echo "Usage: tg api [info|call|build]" >&2
        echo "  tg api info              - Show API endpoints" >&2
        echo "  tg api call <METHOD> <PATH> [DATA] - Call API endpoint" >&2
        echo "  tg api build             - Build API client binary" >&2
        return 1
        ;;
    esac
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
  build                         MCPサーバーとAPI関連をビルド
  stop                          APIサーバーを停止する
  storybook                     Storybookを起動する
  lint                          フロントとMCPサーバーのlintを実行
  test                          全ての動作確認テストを実行（API + MCP）
  test-api                      API動作確認テストを実行
  test-frontend                 フロントエンドのテストを実行
  test-mcp                      MCPサーバー動作確認テストを実行
  create-component              フロントの vue ファイルと stories ファイルを作る
  create-prompt-context         AI のプロンプト用にファイルを結合する
  create-project                新しいプロジェクトファイルを作成する
  mcp-run                       MCPサーバーを開発モードで起動
  api info                      API情報とエンドポイント一覧を表示
  api call                      APIエンドポイントを実行 (例: tg api call GET /projects)
  api build                     APIクライアントのバイナリをビルド
  help                          ヘルプを表示する
END
}

taskgraph_editor "$@"
