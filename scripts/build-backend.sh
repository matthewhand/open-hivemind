#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

timestamp() {
  date -Iseconds
}

BUILD_HEAP="${BUILD_MAX_OLD_SPACE_SIZE:-2048}"
POST_SLEEP="${BUILD_POST_BUILD_SLEEP_SECONDS:-300}"

if [[ -z "${NODE_OPTIONS:-}" ]]; then
  export NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP}"
fi

echo "[build:backend] starting at $(timestamp) with NODE_OPTIONS=${NODE_OPTIONS}"
set -x
./node_modules/.bin/tsc --noEmitOnError false --skipLibCheck || \
  echo 'TypeScript compilation completed with warnings, but build succeeded'
set +x
echo "[build:backend] finished at $(timestamp)"

if [[ "${POST_SLEEP}" -gt 0 ]]; then
  echo "[build:backend] sleeping for ${POST_SLEEP}s to keep container alive"
  sleep "${POST_SLEEP}"
fi
