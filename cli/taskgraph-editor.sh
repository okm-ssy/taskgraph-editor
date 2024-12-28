#!/bin/sh

set -eu

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
  *)
    help && return
    ;;
  esac
}

help() {
  cat <<-END 1>&2

  edit                  vs-code で開く
  help                  ヘルプを表示する
END
}

taskgraph_editor "$@"
