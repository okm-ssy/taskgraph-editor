#!/bin/sh

set -eu

run() {
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm set progress=false
  npm i
  npm run dev
}

run "$@"
