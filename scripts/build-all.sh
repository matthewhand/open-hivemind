#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

"${ROOT_DIR}/scripts/build-backend.sh"

SKIP_FRONTEND="${SKIP_FRONTEND_BUILD:-false}"
LOW_MEM="${LOW_MEMORY_MODE:-false}"
FORCE_FRONTEND="${FORCE_FRONTEND_BUILD:-false}"

if [[ "${SKIP_FRONTEND,,}" == "true" ]]; then
  echo "[build] SKIP_FRONTEND_BUILD=true, skipping frontend bundle"
  exit 0
fi

if [[ "${LOW_MEM,,}" == "true" && "${FORCE_FRONTEND,,}" != "true" ]]; then
  echo "[build] LOW_MEMORY_MODE=true and FORCE_FRONTEND_BUILD!=true, skipping frontend bundle"
  exit 0
fi

"${ROOT_DIR}/scripts/build-frontend.sh"
