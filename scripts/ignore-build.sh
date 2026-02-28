#!/bin/bash

# Vercel provides VERCEL_GIT_COMMIT_REF
# Netlify provides CONTEXT

if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$CONTEXT" = "production" ]; then
  # Proceed with the build
  echo "✓ - Build can proceed (branch/context allowed)"
  exit 1
else
  # Cancel the build
  echo "✗ - Build cancelled (not main branch/production context)"
  exit 0
fi
