#!/bin/bash
#
# Run Performance Baseline Tests
# This script runs both WebUI and API performance tests and generates a summary report.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  Open Hivemind Performance Baseline Tests"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Create test-results directory if it doesn't exist
mkdir -p test-results

# Track start time
START_TIME=$(date +%s)

# WebUI Performance Tests
echo -e "\n${YELLOW}[1/2] Running WebUI Performance Tests...${NC}\n"
if npm run test:e2e tests/e2e/performance-webui.spec.ts; then
    echo -e "\n${GREEN}✅ WebUI Performance Tests Passed${NC}"
    WEBUI_STATUS="PASSED"
else
    echo -e "\n${RED}❌ WebUI Performance Tests Failed${NC}"
    WEBUI_STATUS="FAILED"
fi

echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}\n"

# API Performance Tests
echo -e "\n${YELLOW}[2/2] Running API Performance Tests...${NC}\n"
if npm test tests/api/performance-api.test.ts; then
    echo -e "\n${GREEN}✅ API Performance Tests Passed${NC}"
    API_STATUS="PASSED"
else
    echo -e "\n${RED}❌ API Performance Tests Failed${NC}"
    API_STATUS="FAILED"
fi

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Performance Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "WebUI Tests:  ${WEBUI_STATUS}"
echo -e "API Tests:    ${API_STATUS}"
echo -e "Duration:     ${MINUTES}m ${SECONDS}s"
echo -e "\nBaselines saved to:"
echo -e "  - test-results/performance-baselines.json (WebUI)"
echo -e "  - test-results/api-performance-baselines.json (API)"

# Check if baselines exist and show them
echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"

if [ -f "test-results/performance-baselines.json" ]; then
    echo -e "\n${GREEN}WebUI Baseline Summary:${NC}"
    WEBUI_TESTS=$(jq 'length' test-results/performance-baselines.json 2>/dev/null || echo "N/A")
    echo "  Pages tested: ${WEBUI_TESTS}"

    # Show median page load times
    if command -v jq &> /dev/null; then
        echo "  Median page load times:"
        jq -r '.[] | "    - \(.testName): \(.median.pageLoad)ms"' test-results/performance-baselines.json 2>/dev/null || echo "    (parse error)"
    fi
fi

if [ -f "test-results/api-performance-baselines.json" ]; then
    echo -e "\n${GREEN}API Baseline Summary:${NC}"
    API_TESTS=$(jq 'length' test-results/api-performance-baselines.json 2>/dev/null || echo "N/A")
    echo "  Endpoints tested: ${API_TESTS}"

    # Show median response times
    if command -v jq &> /dev/null; then
        echo "  Median response times:"
        jq -r '.[] | "    - \(.method) \(.endpoint): \(.metrics.median)ms"' test-results/api-performance-baselines.json 2>/dev/null | head -10 || echo "    (parse error)"
    fi
fi

echo -e "\n${BLUE}─────────────────────────────────────────────────────────${NC}"

# Exit code
if [ "$WEBUI_STATUS" == "FAILED" ] || [ "$API_STATUS" == "FAILED" ]; then
    echo -e "\n${RED}⚠️  Some performance tests failed. Review the output above.${NC}\n"
    exit 1
else
    echo -e "\n${GREEN}✅ All performance tests passed!${NC}\n"
    exit 0
fi
