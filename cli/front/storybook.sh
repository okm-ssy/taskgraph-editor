#!/bin/sh

set -eu

storybook() {
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm set progress=false
  npm i
  npm run storybook
}

storybook "$@"
