#!/bin/bash
# Start Open-Hivemind production runtime

echo "[runtime] Starting Open-Hivemind..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Set production env if not already set
export NODE_ENV=${NODE_ENV:-production}

# Run the server
node dist/src/index.js
