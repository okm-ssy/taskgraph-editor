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
    code "${repository_root}/taskgraph-editor.code-workspace"
    return
    ;;
  run)
    script_name='front/run.sh'
    ;;
  storybook)
    script_name='front/storybook.sh'
    ;;
  create_component | create-component)
    script_name='front/create_component.sh'
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

  edit                  vs-code で開く
  run                   フロントを立ち上げる
  create_component      フロントの vue ファイルと stories ファイルを作る
  help                  ヘルプを表示する
END
}

taskgraph_editor "$@"
