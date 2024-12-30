#!/bin/sh

set -eu

run() {
  cd "${REPOSITORY_ROOT}/frontend/"
  npm set progress=false
  npm i
  npm run dev
}

run "$@"
