#!/bin/bash

# Simple secret scanner for CI
# Checks for common patterns of hardcoded secrets

echo "Running secret audit..."

# Patterns to look for
PATTERNS=(
    "AI_KEY"
    "API_KEY"
    "SECRET"
    "TOKEN"
    "PASSWORD"
    "PRIVATE_KEY"
)

# Files/Directories to exclude
EXCLUDES=(
    "node_modules"
    ".git"
    "dist"
    "package-lock.json"
    "pnpm-lock.yaml"
    "*.png"
    "*.jpg"
    "*.jpeg"
    "*.gif"
    "*.ico"
    "scripts/audit-secrets.sh"
    "tests" # Exclude tests as they often use mock secrets
    "scripts/debug"
    "scripts/audit-secrets.sh"
)

# Construct grep exclude arguments
GREP_EXCLUDES=""
for pattern in "${EXCLUDES[@]}"; do
    if [[ $pattern == *"*"* ]]; then
        GREP_EXCLUDES="$GREP_EXCLUDES --exclude=$pattern"
    else
        GREP_EXCLUDES="$GREP_EXCLUDES --exclude-dir=$pattern --exclude=$pattern"
    fi
done

EXIT_CODE=0

for pattern in "${PATTERNS[@]}"; do
    matches=$(grep -rEi "$pattern\s*=\s*['\"][a-zA-Z0-9_\-]{5,}['\"]" . $GREP_EXCLUDES | grep -v "process.env" | grep -v "config.get")

    if [ ! -z "$matches" ]; then
        echo "⚠️ Potential secrets found for pattern '$pattern':"
        echo "$matches"
        EXIT_CODE=1
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ No obvious secrets found in source code."
else
    echo "❌ Secret audit failed. Please remove hardcoded secrets."
fi

exit $EXIT_CODE
