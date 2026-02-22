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
pushd src/client >/dev/null
set -x
# Use npx to find vite in PATH or node_modules
NODE_ENV=production npx vite build
set +x
popd >/dev/null
echo "[build:frontend] finished at $(timestamp)"
