#!/bin/bash

# Simple SLOC Analysis for Outstanding Branches
# Uses git log and diff to analyze branch differences

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔍 Simple SLOC Analysis for Outstanding Branches${NC}"
echo -e "${CYAN}============================================${NC}"
echo

# Get branches to analyze
BRANCHES=$(git branch -r | grep -v 'origin/main$' | grep -v 'origin/HEAD' | grep -v 'origin/archive' | grep -v 'origin/automerge-to-main' | grep -v 'origin/backup' | grep -v 'origin/experimental' | grep -v 'origin/copilot' | sed 's/^[[:space:]]*origin\///')

if [ -z "$BRANCHES" ]; then
    echo -e "${GREEN}✅ No outstanding branches to analyze!${NC}"
    exit 0
fi

echo -e "${YELLOW}📊 Analyzing $(echo "$BRANCHES" | wc -l | tr -d ' ') branches...${NC}"
echo

# Function to analyze a single branch
analyze_branch() {
    local branch="$1"
    local base_branch="${2:-main}"

    echo -e "${BLUE}🔍 Analyzing: $branch${NC}"

    # Check if branch exists
    if ! git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
        echo -e "${RED}❌ Branch $branch does not exist${NC}"
        echo "$branch|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR"
        return 1
    fi

    # Get commit stats
    local commits_ahead=$(git rev-list --count "origin/$base_branch..origin/$branch" 2>/dev/null || echo "0")
    local commits_behind=$(git rev-list --count "origin/$branch..origin/$base_branch" 2>/dev/null || echo "0")

    # Get file changes and SLOC
    local files_changed=$(git diff --name-only "origin/$base_branch..origin/$branch" 2>/dev/null | wc -l)
    local additions=0
    local deletions=0

    # Get line changes (simplified approach)
    local diff_output=$(git diff --stat "origin/$base_branch..origin/$branch" 2>/dev/null || echo "")
    if [ -n "$diff_output" ]; then
        # Extract additions and deletions from the last line of git diff --stat
        local stats_line=$(echo "$diff_output" | tail -1)
        additions=$(echo "$stats_line" | grep -o '[0-9]\+ insertion' | grep -o '[0-9]\+' | head -1 || echo "0")
        deletions=$(echo "$stats_line" | grep -o '[0-9]\+ deletion' | grep -o '[0-9]\+' | head -1 || echo "0")

        # Fallback to 0 if not found
        [ -z "$additions" ] && additions="0"
        [ -z "$deletions" ] && deletions="0"
    fi

    # Get last commit info
    local last_commit_hash=$(git log -1 --format="%h" "origin/$branch" 2>/dev/null || echo "unknown")
    local last_commit_date=$(git log -1 --format="%ci" "origin/$branch" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
    local last_commit_author=$(git log -1 --format="%an" "origin/$branch" 2>/dev/null || echo "unknown")
    local last_commit_msg=$(git log -1 --format="%s" "origin/$branch" 2>/dev/null | cut -c1-50 || echo "unknown")

    echo "$commits_ahead|$commits_behind|$files_changed|$additions|$deletions|$last_commit_hash|$last_commit_date|$last_commit_author|$last_commit_msg"
    echo -e "${GREEN}✅ Completed: $branch${NC}"
    echo
}

# Header
printf "${PURPLE}%-35s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-25s${NC}\n" "Branch" "Commits↑" "Commits↓" "Files" "Additions" "Deletions" "Hash" "Date" "Last Commit"
printf "${PURPLE}%-35s-+-%-8s-+-%-8s-+-%-8s-+-%-10s-+-%-10s-+-%-7s-+-%-12s-+-%-25s${NC}\n" "-----------------------------------" "--------" "--------" "--------" "----------" "----------" "-------" "------------" "-------------------------"

# Track totals
total_additions=0
total_deletions=0
total_files=0
total_branches=0

# Analyze each branch
for branch in $BRANCHES; do
    result=$(analyze_branch "$branch")

    IFS='|' read -r commits_ahead commits_behind files_changed additions deletions last_commit_hash last_commit_date last_commit_author last_commit_msg <<< "$result"

    # Skip error entries
    if [ "$commits_ahead" = "ERROR" ]; then
        printf "${RED}%-35s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-25s${NC}\n" "$branch" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR"
        continue
    fi

    # Color code based on activity
    if [ "$commits_ahead" -gt 10 ]; then
        color="${RED}"
    elif [ "$commits_ahead" -gt 5 ]; then
        color="${YELLOW}"
    elif [ "$commits_ahead" -gt 0 ]; then
        color="${GREEN}"
    else
        color="${BLUE}"
    fi

    # Truncate fields if needed
    branch_display=$(echo "$branch" | cut -c1-33)
    author_display=$(echo "$last_commit_author" | cut -c1-22)

    printf "${color}%-35s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-25s${NC}\n" "$branch_display" "$commits_ahead" "$commits_behind" "$files_changed" "$additions" "$deletions" "$last_commit_hash" "$last_commit_date" "$author_display"

    # Accumulate totals (only for successful branches)
    if [ "$commits_ahead" != "ERROR" ]; then
        total_additions=$((total_additions + additions))
        total_deletions=$((total_deletions + deletions))
        total_files=$((total_files + files_changed))
        total_branches=$((total_branches + 1))
    fi
done

echo
echo -e "${CYAN}📊 Summary Statistics${NC}"
echo -e "${CYAN}==================${NC}"
echo -e "${GREEN}Total Branches Analyzed:${NC} $total_branches"
echo -e "${GREEN}Total Files Changed:${NC} $total_files"
echo -e "${GREEN}Total Additions:${NC} $total_additions"
echo -e "${GREEN}Total Deletions:${NC} $total_deletions"
echo -e "${GREEN}Net Code Change:${NC} $((total_additions - total_deletions))"

if [ $total_branches -gt 0 ]; then
    avg_files=$((total_files / total_branches))
    avg_additions=$((total_additions / total_branches))
    avg_deletions=$((total_deletions / total_branches))
    echo -e "${BLUE}Average Files per Branch:${NC} $avg_files"
    echo -e "${BLUE}Average Additions per Branch:${NC} $avg_additions"
    echo -e "${BLUE}Average Deletions per Branch:${NC} $avg_deletions"
fi

echo
echo -e "${GREEN}✅ Simple SLOC Analysis Complete!${NC}"