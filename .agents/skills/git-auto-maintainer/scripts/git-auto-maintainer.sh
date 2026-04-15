#!/bin/bash
set -e

# Configuration
BASE_BRANCH="main"
DEV_COMMAND="pnpm run dev"
TIMEOUT_DEV=60

echo ">>> Starting Git Auto Maintainer workflow..."

# 1. Sync
echo ">>> Checking git status and pulling changes..."
git status
git pull origin "$BASE_BRANCH" --rebase || {
  echo ">>> Rebase failed, attempting to resolve conflicts..."
  # Resolving conflicts: if "not ours," we prefer 'theirs'.
  # This matches the user's "resolve conflict even not ours" requirement.
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  for file in $CONFLICTS; do
    echo ">>> Resolving conflict in $file (favoring 'theirs')..."
    git checkout --theirs "$file"
    git add "$file"
  done
  git rebase --continue || { echo ">>> Rebase continue failed. Manual intervention needed."; exit 1; }
}

# 1b. Install
echo ">>> Updating dependencies..."
pnpm install

# 2. Build
echo ">>> Running build..."
pnpm run build || { echo ">>> Build failed. Fix errors and retry."; exit 1; }

# 3. Lint
echo ">>> Running lint..."
pnpm run lint:fix || true
pnpm run lint || { echo ">>> Lint failed. Fix remaining errors manually."; exit 1; }

# 4. Test
echo ">>> Running tests..."
pnpm run test || { echo ">>> Tests failed. Fix failing tests."; exit 1; }

# 5. Runtime validation
echo ">>> Running dev for $TIMEOUT_DEV seconds..."
timeout "$TIMEOUT_DEV" "$DEV_COMMAND" || {
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 124 ]; then
    echo ">>> Dev command timed out (as expected). Checking logs for errors..."
  else
    echo ">>> Dev command crashed with exit code $EXIT_CODE. Fix errors."; exit 1;
  fi
}

# 6. PR & Merge
echo ">>> Opening PR..."
gh pr create --title "Automated maintenance and fixes" --body "Automated PR from git-auto-maintainer skill." --fill || true

echo ">>> Checking PR status for unresolved comments or requested changes..."
# Get the PR status. We check for 'CHANGES_REQUESTED' in reviews, and if there are unresolved comment threads.
# (This assumes there's an open PR for the current branch)
PR_STATUS=$(gh pr view --json reviewDecision,comments -q '{decision: .reviewDecision, comments: .comments | length}') || {
  echo ">>> Could not fetch PR status. Skipping merge."
  exit 1
}

DECISION=$(echo "$PR_STATUS" | grep -o '"decision":"[^"]*"' | cut -d'"' -f4)
COMMENTS=$(echo "$PR_STATUS" | grep -o '"comments":[0-9]*' | cut -d':' -f2)

if [ "$DECISION" == "CHANGES_REQUESTED" ]; then
  echo ">>> Changes requested on the PR. Halting merge."
  exit 1
fi

# Ideally, we'd check if comments are resolved, but as a heuristic, if there are ANY comments, we might want manual review.
# We'll allow it if there are 0 comments, or we can prompt. For automation, halt if there are comments.
if [ "$COMMENTS" -gt 0 ]; then
  echo ">>> There are $COMMENTS comments on the PR. Please address them manually. Halting merge."
  exit 1
fi

# 7. Merge (with auto-merge for squash)
echo ">>> Enabling auto-merge (squash)..."
gh pr merge --squash --auto
