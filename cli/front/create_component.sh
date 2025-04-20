#!/bin/sh

set -eu

# スクリプトの使用方法を表示する関数
show_usage() {
  echo "Usage: $0 <component-name>"
  echo "Example: $0 MyComponent"
  exit 1
}

create_component() {
  cd "${REPOSITORY_ROOT}/apps/create_component"

  # コンポーネント名を取得
  COMPONENT_NAME=$1

  # 必要なディレクトリの作成
  COMPONENT_TEMPLATE="${REPOSITORY_ROOT}/apps/frontend/src/template/component.vue.hbs"
  STORY_TEMPLATE="${REPOSITORY_ROOT}/apps/frontend/src/template/component.stories.ts.hbs"

  COMPONENT_OUTPUT="${REPOSITORY_ROOT}/apps/frontend/src/components/${COMPONENT_NAME}.vue"
  STORY_OUTPUT="${REPOSITORY_ROOT}/apps/frontend/src/components/${COMPONENT_NAME}.stories.ts"

  # 必要なパッケージがインストールされているか確認
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed"
    exit 1
  fi

  # handlebarsパッケージがインストールされているか確認し、なければインストール
  if ! npm list handlebars >/dev/null 2>&1; then
    echo "Installing handlebars package..."
    npm install handlebars
  fi

  # Node.jsスクリプトを実行
  node main.js "$COMPONENT_TEMPLATE" "$COMPONENT_OUTPUT" "$COMPONENT_NAME"
  node main.js "$STORY_TEMPLATE" "$STORY_OUTPUT" "$COMPONENT_NAME"

  echo "create ${COMPONENT_OUTPUT}" 1>&2
  echo "create ${STORY_OUTPUT}" 1>&2

  # ファイルが増えたので再度 npm install をする
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm i
}

# 引数チェック
if [ $# -eq 0 ]; then
  show_usage
fi

create_component "$@"
