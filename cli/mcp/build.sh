#!/bin/sh

set -eu

mcp_build() {
  cd "${REPOSITORY_ROOT}/apps/mcp-server/"
  npm set progress=false
  npm i
  npm run build
}

mcp_build "$@"