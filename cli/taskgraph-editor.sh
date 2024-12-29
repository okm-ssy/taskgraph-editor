#!/bin/sh

set -e

taskgraph_editor() {
  # command_name=taskgraph
  repository_root=$(
    cd "$(dirname "$0")"/..
    pwd
  )

  subcommand=$1
  [ $# -gt 0 ] && shift
  case $subcommand in
  edit)
    code "${repository_root}/taskgraph-editor.code-workspace"
    ;;
  run)
    cd "${repository_root}/frontend/"
    npm set progress=false
    npm i
    npm run dev
    ;;
  storybook)
    cd "${repository_root}/frontend/"
    npm set progress=false
    npm i
    npm run storybook
    ;;
  *)
    help && return
    ;;
  esac
}

help() {
  cat <<-END 1>&2

  edit                  vs-code で開く
  run                   フロントを立ち上げる
  help                  ヘルプを表示する
END
}

taskgraph_editor "$@"
