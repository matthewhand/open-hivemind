#!/usr/bin/env bash

# Legacy shim retained for backwards compatibility.
# Prefer running `npm run dev`, which uses the cross-platform Node launcher.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -eq 0 ]; then
  set -- dev
fi

node "${SCRIPT_DIR}/scripts/dev-start.js" "$@"
