#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/start-runtime.sh [--setup]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

timestamp() {
  date -Iseconds
}

# Optional setup flag to ensure everything is ready
SETUP="${1:-}"
if [[ "$SETUP" == "--setup" ]]; then
  echo "[start-runtime] --setup flag detected, checking environment..."
  
  if [ ! -d "node_modules" ]; then
    echo "[start-runtime] node_modules not found, running npm install..."
    npm install
  fi

  if [ ! -d "src/client/dist" ]; then
    echo "[start-runtime] frontend build not found, building..."
    npm run build:frontend
  fi
fi

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
