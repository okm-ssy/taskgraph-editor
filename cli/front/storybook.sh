#!/bin/sh

set -eu

storybook() {
  cd "${REPOSITORY_ROOT}/frontend/"
  npm set progress=false
  npm i
  npm run storybook
}

storybook "$@"
