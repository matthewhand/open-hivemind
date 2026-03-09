#!/bin/bash
# Basic hardcoded secrets scanner.
# Checks source files for common secret patterns and fails CI if any are found.

echo "Auditing for hardcoded secrets..."

EXIT_CODE=0

# Directories to scan
SCAN_DIRS="src tests packages"

# Patterns that are likely hardcoded secrets (not env var references)
PATTERNS=(
  'sk-[A-Za-z0-9]{48}'         # OpenAI API key
  'xoxb-[A-Za-z0-9\-]+'        # Slack bot token
  'xoxp-[A-Za-z0-9\-]+'        # Slack user token
  'AKIA[A-Z0-9]{16}'           # AWS access key ID
  'ghp_[A-Za-z0-9]{36}'        # GitHub personal access token
  'password\s*=\s*["'"'"'][^"'"'"']{8,}["'"'"']'  # Literal password assignments
)

for pattern in "${PATTERNS[@]}"; do
  matches=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
    -E "$pattern" $SCAN_DIRS 2>/dev/null \
    | grep -v "node_modules" \
    | grep -v "\.test\." \
    | grep -v "process\.env\." \
    | grep -v "// " )

  if [ -n "$matches" ]; then
    echo "⚠️  Potential secret found (pattern: $pattern):"
    echo "$matches"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ No hardcoded secrets detected."
fi

exit $EXIT_CODE
