#!/bin/sh

set -eu

lint() {
  cd "${REPOSITORY_ROOT}/apps/frontend/"
  npm set progress=false
  npm i
  npm run lint

  cd "${REPOSITORY_ROOT}/apps/mcp-server/"
  npm set progress=false
  npm i
  npm run lint
}

lint "$@"
