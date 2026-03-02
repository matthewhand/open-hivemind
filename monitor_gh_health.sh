#!/bin/bash

# threshold in seconds (e.g., 1 hour = 3600 seconds)
THRESHOLD=3600

echo "Checking pipeline health..."
NOW=$(date +%s)

# Get runs that are currently in progress or queued
RUNS_IN_PROGRESS=$(gh run list --status in_progress --json databaseId,status,createdAt,name,headBranch --jq '.[] | [ .databaseId, .status, .createdAt, .name, .headBranch ] | @tsv')
RUNS_QUEUED=$(gh run list --status queued --json databaseId,status,createdAt,name,headBranch --jq '.[] | [ .databaseId, .status, .createdAt, .name, .headBranch ] | @tsv')

RUNS=$(echo -e "$RUNS_IN_PROGRESS\n$RUNS_QUEUED" | grep -v '^\s*$')

if [ -z "$RUNS" ]; then
    echo "No actively running or queued CI jobs."
    exit 0
fi

STUCK_COUNT=0

while IFS=$'\t' read -r id status created_at name branch; do
    # Convert ISO8601 creation time to epoch seconds
    CREATED_EPOCH=$(date -d "$created_at" +%s)
    ELAPSED=$((NOW - CREATED_EPOCH))
    
    if [ "$ELAPSED" -gt "$THRESHOLD" ]; then
        echo "⚠️  WARNING: Workflow \"$name\" ($id) on branch \"$branch\" has been $status for $ELAPSED seconds!"
        STUCK_COUNT=$((STUCK_COUNT + 1))
    fi
done <<< "$RUNS"

if [ "$STUCK_COUNT" -eq 0 ]; then
    echo "✅ Pipeline is healthy. All active runs have been running/queued for less than an hour."
else
    echo "❌ Found $STUCK_COUNT potentially jammed/stuck jobs. You can cancel them with: gh run cancel <ID>"
fi
