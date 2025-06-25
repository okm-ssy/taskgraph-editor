#!/bin/sh

set -eu

mcp_dev() {
  cd "${REPOSITORY_ROOT}/apps/mcp-server/"
  npm set progress=false
  npm i
  npm run dev
}

mcp_dev "$@"