#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

timestamp() {
  date -Iseconds
}

FRONTEND_HEAP="${BUILD_FRONTEND_MAX_OLD_SPACE_SIZE:-${BUILD_MAX_OLD_SPACE_SIZE:-2048}}"

if [[ -z "${NODE_OPTIONS:-}" ]]; then
  export NODE_OPTIONS="--max-old-space-size=${FRONTEND_HEAP}"
fi

echo "[build:frontend] starting at $(timestamp) with NODE_OPTIONS=${NODE_OPTIONS}"
set -x
# Run vite build directly using local node_modules
cd src/client
NODE_ENV=production ../../node_modules/.bin/vite build
cd ../..
set +x
echo "[build:frontend] finished at $(timestamp)"
