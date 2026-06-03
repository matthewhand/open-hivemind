#!/bin/bash

# Monitoring Utility Script
# Basic health checks and log tailing for the Open Hivemind server.
# Usage: ./scripts/monitoring.sh [command]
# Commands: status, logs, health

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Default port if not provided by env
PORT=${PORT:-3028}
HEALTH_ENDPOINT="http://localhost:${PORT}/api/health"

echo -e "${BLUE}🔧 Open Hivemind Monitoring Utility${NC}"

# Function to check application health
check_health() {
    echo -e "${YELLOW}📡 Checking application health at ${HEALTH_ENDPOINT}...${NC}"
    if curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        health_data=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null)
        status=$(echo "$health_data" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

        if [[ "$status" == "healthy" || "$status" == "ok" ]]; then
            echo -e "${GREEN}✅ Application is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️ Application status: $status${NC}"
        fi

        echo -e "${BLUE}📋 Health Data:${NC}"
        echo "$health_data"
    else
        echo -e "${RED}❌ Application health check failed - server might be down or on a different port.${NC}"
        echo -e "Try: PORT=3028 ./scripts/monitoring.sh health"
        exit 1
    fi
}

# Function to tail logs
tail_logs() {
    echo -e "${BLUE}📋 Tailing application logs...${NC}"
    if [[ -f "$PROJECT_ROOT/logs/app.log" ]]; then
        tail -f "$PROJECT_ROOT/logs/app.log"
    elif [[ -f "logs/app.log" ]]; then
        tail -f "logs/app.log"
    else
        echo -e "${YELLOW}⚠️ No app.log found in logs/. Tailing stdout via PM2/docker if available is recommended.${NC}"
        # Fallback to checking common log locations
        find "$PROJECT_ROOT" -name "*.log" -maxdepth 2
    fi
}

# Main command handler
case "${1:-status}" in
    "status"|"health")
        check_health
        ;;
    "logs")
        tail_logs
        ;;
    "help"|"-h"|"--help")
        echo "Open Hivemind Monitoring Utility"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  status / health  Check application health endpoint"
        echo "  logs             Tail application logs"
        echo "  help             Show this help message"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac