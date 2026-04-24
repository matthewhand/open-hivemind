#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${GITHUB_BASE_SHA:-$(git merge-base origin/main HEAD)}"
HEAD_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"

mapfile -t CHANGED_FILES < <(git diff --name-only "${BASE_SHA}...${HEAD_SHA}" | sed '/^$/d')
if [ "${#CHANGED_FILES[@]}" -eq 0 ]; then
  echo "No changed files detected; skipping changed-files test job."
  exit 0
fi

mapfile -t ALL_TESTS < <(rg --files tests | rg '\.(test|spec)\.[tj]sx?$' || true)
declare -A SELECTED=()

for file in "${CHANGED_FILES[@]}"; do
  if [[ "$file" =~ ^tests/.*\.(test|spec)\.[tj]sx?$ ]]; then
    SELECTED["$file"]=1
  fi

  if [[ "$file" =~ ^src/ || "$file" =~ ^packages/ ]]; then
    base="$(basename "$file")"
    stem="${base%.ts}"
    stem="${stem%.tsx}"
    stem="${stem%.js}"
    stem="${stem%.jsx}"
    stem="${stem%.test}"
    stem="${stem%.spec}"
    if [ -n "$stem" ]; then
      for test_file in "${ALL_TESTS[@]}"; do
        if [[ "$test_file" == *"$stem"* ]]; then
          SELECTED["$test_file"]=1
        fi
      done
    fi
  fi
done

mapfile -t TESTS_TO_RUN < <(printf '%s\n' "${!SELECTED[@]}" | sort)
if [ "${#TESTS_TO_RUN[@]}" -eq 0 ]; then
  echo "No related tests selected from changed files; skipping."
  exit 0
fi

if [ "${#TESTS_TO_RUN[@]}" -gt 60 ]; then
  echo "Selected ${#TESTS_TO_RUN[@]} tests; capping to first 60 for fast feedback."
  TESTS_TO_RUN=("${TESTS_TO_RUN[@]:0:60}")
fi

echo "Running ${#TESTS_TO_RUN[@]} selected tests from changed files..."
NODE_CONFIG_DIR=config/test NODE_ENV=test node -r dotenv/config ./node_modules/jest/bin/jest.js \
  --runInBand \
  --passWithNoTests \
  --runTestsByPath \
  "${TESTS_TO_RUN[@]}"
