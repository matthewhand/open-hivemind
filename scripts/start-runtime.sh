#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

timestamp() {
  date -Iseconds
}

RUNTIME_BUILD="${RUNTIME_BUILD_ON_START:-false}"
RUNTIME_HEAP="${RUNTIME_MAX_OLD_SPACE_SIZE:-256}"

if [[ -z "${NODE_OPTIONS:-}" ]]; then
  export NODE_OPTIONS="--max-old-space-size=${RUNTIME_HEAP}"
fi

echo "[start-runtime] starting at $(timestamp) with NODE_ENV=${NODE_ENV:-production} NODE_OPTIONS=${NODE_OPTIONS}"

if [[ "${RUNTIME_BUILD,,}" == "true" ]]; then
  echo "[start-runtime] RUNTIME_BUILD_ON_START=true, running npm run build first"
  npm run build
fi

NODE_ENV="${NODE_ENV:-production}" node dist/src/index.js
