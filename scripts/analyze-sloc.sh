#!/bin/bash

# SLOC Analysis Script for Remaining Branches
# This script analyzes source lines of code differences for outstanding branches

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 SLOC Analysis for Outstanding Branches${NC}"
echo -e "${CYAN}============================================${NC}"
echo

# Get list of branches to analyze (excluding protected/archive branches)
BRANCHES=$(git branch -r | grep -v 'origin/main$' | grep -v 'origin/HEAD' | grep -v 'origin/archive' | grep -v 'origin/automerge-to-main' | grep -v 'origin/backup' | grep -v 'origin/experimental' | grep -v 'origin/copilot' | sed 's/origin\///')

if [ -z "$BRANCHES" ]; then
    echo -e "${GREEN}✅ No outstanding branches to analyze!${NC}"
    exit 0
fi

# Create temporary directory for analysis
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}📁 Using temporary directory: $TEMP_DIR${NC}"
echo

# Function to count SLOC for a directory
count_sloc() {
    local dir="$1"
    if [ -d "$dir" ]; then
        # Count TypeScript, JavaScript, and other relevant files
        find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/coverage/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0"
    else
        echo "0"
    fi
}

# Function to get basic git stats for a branch
get_git_stats() {
    local branch="$1"
    local base_branch="${2:-main}"

    # Create temporary work tree for the branch (sanitize branch name)
    local safe_branch_name=$(echo "$branch" | sed 's/\//_/g')
    local worktree="$TEMP_DIR/$safe_branch_name"
    git worktree add "$worktree" "origin/$branch" 2>/dev/null || return 1

    cd "$worktree"

    # Get basic stats
    local commits_ahead=$(git rev-list --count "origin/$base_branch..origin/$branch" 2>/dev/null || echo "0")
    local commits_behind=$(git rev-list --count "origin/$branch..origin/$base_branch" 2>/dev/null || echo "0")
    local files_changed=$(git diff --name-only "origin/$base_branch..origin/$branch" 2>/dev/null | wc -l)
    local additions=$(git diff --stat "origin/$base_branch..origin/$branch" 2>/dev/null | grep "files changed" | awk -F'+' '{print $2}' | awk '{print $1}' || echo "0")
    local deletions=$(git diff --stat "origin/$base_branch..origin/$branch" 2>/dev/null | grep "files changed" | awk -F'-' '{print $2}' | awk '{print $1}' || echo "0")

    # Get last commit info
    local last_commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local last_commit_date=$(git log -1 --format="%ci" 2>/dev/null || echo "unknown")
    local last_commit_author=$(git log -1 --format="%an" 2>/dev/null || echo "unknown")
    local last_commit_msg=$(git log -1 --format="%s" 2>/dev/null || echo "unknown")

    cd - > /dev/null

    echo "$commits_ahead|$commits_behind|$files_changed|$additions|$deletions|$last_commit_hash|$last_commit_date|$last_commit_author|$last_commit_msg"
}

echo -e "${YELLOW}📊 Analyzing $(echo "$BRANCHES" | wc -l | tr -d ' ') branches...${NC}"
echo

# Results arrays
declare -a BRANCH_RESULTS

# Analyze each branch
for branch in $BRANCHES; do
    echo -e "${BLUE}🔍 Analyzing branch: $branch${NC}"

      safe_branch_name=$(echo "$branch" | sed 's/\//_/g')
    if get_git_stats "$branch" > "$TEMP_DIR/stats_$safe_branch_name" 2>&1; then
        echo -e "${GREEN}✅ Successfully analyzed $branch${NC}"
    else
        echo -e "${RED}❌ Failed to analyze $branch${NC}"
        echo "$branch|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR|ERROR" > "$TEMP_DIR/stats_$safe_branch_name"
    fi
done

echo
echo -e "${CYAN}📈 SLOC Analysis Results${NC}"
echo -e "${CYAN}========================${NC}"
echo

# Print header
printf "${PURPLE}%-30s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-20s${NC}\n" "Branch" "Commits↑" "Commits↓" "Files" "Additions" "Deletions" "Hash" "Date" "Author"
printf "${PURPLE}%-30s-+-%-8s-+-%-8s-+-%-8s-+-%-10s-+-%-10s-+-%-7s-+-%-12s-+-%-20s${NC}\n" "------------------------------" "--------" "--------" "--------" "----------" "----------" "-------" "------------" "--------------------"

# Sort and display results
total_additions=0
total_deletions=0
total_files=0

for branch in $BRANCHES; do
    safe_branch_name=$(echo "$branch" | sed 's/\//_/g')
    if [ -f "$TEMP_DIR/stats_$safe_branch_name" ]; then
        IFS='|' read -r commits_ahead commits_behind files_changed additions deletions last_commit_hash last_commit_date last_commit_author last_commit_msg < "$TEMP_DIR/stats_$safe_branch_name"

        # Skip error entries
        if [ "$commits_ahead" = "ERROR" ]; then
            printf "${RED}%-30s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-20s${NC}\n" "$branch" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR" "ERROR"
            continue
        fi

        # Accumulate totals
        total_additions=$((total_additions + additions))
        total_deletions=$((total_deletions + deletions))
        total_files=$((total_files + files_changed))

        # Format date (show only date part)
        short_date=$(echo "$last_commit_date" | cut -d' ' -f1)

        # Truncate author name if too long
        author_display=$(echo "$last_commit_author" | cut -c1-18)

        # Color code based on activity
        if [ "$commits_ahead" -gt 10 ]; then
            color="${RED}"
        elif [ "$commits_ahead" -gt 5 ]; then
            color="${YELLOW}"
        else
            color="${GREEN}"
        fi

        printf "${color}%-30s | %-8s | %-8s | %-8s | %-10s | %-10s | %-7s | %-12s | %-20s${NC}\n" "$branch" "$commits_ahead" "$commits_behind" "$files_changed" "$additions" "$deletions" "$last_commit_hash" "$short_date" "$author_display"
    fi
done

echo
echo -e "${CYAN}📊 Summary Statistics${NC}"
echo -e "${CYAN}==================${NC}"
echo -e "${GREEN}Total Branches Analyzed:${NC} $(echo "$BRANCHES" | wc -l | tr -d ' ')"
echo -e "${GREEN}Total Files Changed:${NC} $total_files"
echo -e "${GREEN}Total Additions:${NC} $total_additions"
echo -e "${GREEN}Total Deletions:${NC} $total_deletions"
echo -e "${GREEN}Net Code Change:${NC} $((total_additions - total_deletions))"

# Calculate average
if [ "$(echo "$BRANCHES" | wc -l | tr -d ' ')" -gt 0 ]; then
    avg_files=$((total_files / $(echo "$BRANCHES" | wc -l | tr -d ' ')))
    avg_additions=$((total_additions / $(echo "$BRANCHES" | wc -l | tr -d ' ')))
    avg_deletions=$((total_deletions / $(echo "$BRANCHES" | wc -l | tr -d ' ')))
    echo -e "${BLUE}Average Files per Branch:${NC} $avg_files"
    echo -e "${BLUE}Average Additions per Branch:${NC} $avg_additions"
    echo -e "${BLUE}Average Deletions per Branch:${NC} $avg_deletions"
fi

echo
echo -e "${CYAN}🔗 Top 5 Branches by Commits Ahead${NC}"
echo -e "${CYAN}==============================${NC}"

# Get top 5 branches by commits ahead
for branch in $BRANCHES; do
    safe_branch_name=$(echo "$branch" | sed 's/\//_/g')
    if [ -f "$TEMP_DIR/stats_$safe_branch_name" ]; then
        IFS='|' read -r commits_ahead commits_behind files_changed additions deletions last_commit_hash last_commit_date last_commit_author last_commit_msg < "$TEMP_DIR/stats_$safe_branch_name"
        if [ "$commits_ahead" != "ERROR" ]; then
            echo "$commits_ahead|$branch"
        fi
    fi
done | sort -nr | head -5 | while IFS='|' read -r commits branch; do
    echo -e "${YELLOW}$commits${NC} commits ahead - ${PURPLE}$branch${NC}"
done

echo
echo -e "${CYAN}📅 Most Recently Active Branches${NC}"
echo -e "${CYAN}===============================${NC}"

# Get most recently updated branches
for branch in $BRANCHES; do
    safe_branch_name=$(echo "$branch" | sed 's/\//_/g')
    if [ -f "$TEMP_DIR/stats_$safe_branch_name" ]; then
        IFS='|' read -r commits_ahead commits_behind files_changed additions deletions last_commit_hash last_commit_date last_commit_author last_commit_msg < "$TEMP_DIR/stats_$safe_branch_name"
        if [ "$commits_ahead" != "ERROR" ]; then
            echo "$last_commit_date|$branch|$last_commit_author|$commits_ahead"
        fi
    fi
done | sort -r | head -5 | while IFS='|' read -r date branch author commits; do
    short_date=$(echo "$date" | cut -d' ' -f1)
    echo -e "${YELLOW}$short_date${NC} - ${PURPLE}$branch${NC} (${GREEN}$author${NC}, ${BLUE}$commits${NC} commits)"
done

# Cleanup
echo
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
git worktree prune
rm -rf "$TEMP_DIR"

echo
echo -e "${GREEN}✅ SLOC Analysis Complete!${NC}"