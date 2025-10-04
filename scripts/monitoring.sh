#!/bin/bash

# Monitoring and Alerting Script
# Usage: ./scripts/monitoring.sh [command]
# Commands: start, stop, status, report, health

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MONITORING_PORT=9000
HEALTH_ENDPOINT="http://localhost:3000/health"
METRICS_ENDPOINT="http://localhost:3000/metrics"
ALERTS_ENDPOINT="http://localhost:3000/alerts"

echo -e "${BLUE}🔧 Open Hivemind Monitoring System${NC}"
echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not available${NC}"
    exit 1
fi

# Function to check if the monitoring service is running
is_monitoring_running() {
    if pgrep -f "node.*monitoring" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start monitoring
start_monitoring() {
    echo -e "${YELLOW}🚀 Starting monitoring system...${NC}"

    cd "$PROJECT_ROOT"

    # Check if application is running
    if ! curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Application is not running. Starting application...${NC}"
        npm run dev &
        sleep 5
    fi

    # Start monitoring service
    if is_monitoring_running; then
        echo -e "${GREEN}✅ Monitoring system is already running${NC}"
        return
    fi

    # Create monitoring service entry point
    cat > "$PROJECT_ROOT/monitoring-service.js" << 'EOF'
const { MonitoringService } = require('./src/monitoring/MonitoringService');

const config = {
    healthCheck: {
        enabled: true,
        interval: 30000,
        maxHistory: 100
    },
    alerts: {
        enabled: true,
        config: {
            memoryThreshold: 85,
            diskThreshold: 90,
            responseTimeThreshold: 1000,
            errorRateThreshold: 5,
            consecutiveFailures: 3,
            cooldownPeriod: 300000
        },
        channels: [
            {
                name: 'console',
                type: 'console',
                config: {},
                send: async (alert) => {
                    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}`);
                    console.log(`   ${alert.message}`);
                    return true;
                }
            }
        ]
    },
    metrics: {
        enabled: true,
        interval: 5000,
        historySize: 1000
    },
    endpoints: {
        health: '/health',
        metrics: '/metrics',
        alerts: '/alerts'
    }
};

const monitoring = new MonitoringService(config);

monitoring.start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔧 Shutting down monitoring service...');
    monitoring.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔧 Shutting down monitoring service...');
    monitoring.stop();
    process.exit(0);
});

console.log('📊 Monitoring service started');
EOF

    # Start monitoring service in background
    nohup node "$PROJECT_ROOT/monitoring-service.js" > "$PROJECT_ROOT/monitoring.log" 2>&1 &
    MONITORING_PID=$!

    echo $MONITORING_PID > "$PROJECT_ROOT/monitoring.pid"

    sleep 2

    if is_monitoring_running; then
        echo -e "${GREEN}✅ Monitoring system started successfully (PID: $MONITORING_PID)${NC}"
        echo -e "${BLUE}📊 Health endpoint: $HEALTH_ENDPOINT${NC}"
        echo -e "${BLUE}📈 Metrics endpoint: $METRICS_ENDPOINT${NC}"
        echo -e "${BLUE}🚨 Alerts endpoint: $ALERTS_ENDPOINT${NC}"
    else
        echo -e "${RED}❌ Failed to start monitoring system${NC}"
        rm -f "$PROJECT_ROOT/monitoring.pid"
        exit 1
    fi
}

# Function to stop monitoring
stop_monitoring() {
    echo -e "${YELLOW}🛑 Stopping monitoring system...${NC}"

    cd "$PROJECT_ROOT"

    # Stop monitoring service
    if [[ -f "$PROJECT_ROOT/monitoring.pid" ]]; then
        MONITORING_PID=$(cat "$PROJECT_ROOT/monitoring.pid")

        if kill -0 $MONITORING_PID 2>/dev/null; then
            kill $MONITORING_PID
            sleep 2

            if kill -0 $MONITORING_PID 2>/dev/null; then
                echo -e "${YELLOW}⚠️ Force killing monitoring service...${NC}"
                kill -9 $MONITORING_PID
            fi
        fi

        rm -f "$PROJECT_ROOT/monitoring.pid"
        echo -e "${GREEN}✅ Monitoring system stopped${NC}"
    else
        echo -e "${YELLOW}⚠️ No monitoring PID file found${NC}"
    fi

    # Clean up monitoring service files
    rm -f "$PROJECT_ROOT/monitoring-service.js"
    rm -f "$PROJECT_ROOT/monitoring.log"

    # Kill any remaining monitoring processes
    pkill -f "node.*monitoring" 2>/dev/null || true
    echo -e "${GREEN}✅ Monitoring cleanup completed${NC}"
}

# Function to check monitoring status
check_status() {
    echo -e "${BLUE}📊 Monitoring System Status${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # Check if monitoring service is running
    if is_monitoring_running; then
        echo -e "${GREEN}✅ Monitoring service is running${NC}"

        # Show process details
        pgrep -f "node.*monitoring" | head -5 | while read pid; do
            echo -e "${BLUE}   Process PID: $pid${NC}"
            ps -p $pid -o pid,etime,cmd --no-headers
        done
    else
        echo -e "${RED}❌ Monitoring service is not running${NC}"
    fi

    # Check application health
    echo ""
    echo -e "${BLUE}🔍 Application Health${NC}"
    if curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy${NC}"

        # Show health details
        health_data=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null)
        if [[ $? -eq 0 ]]; then
            status=$(echo "$health_data" | jq -r '.status' 2>/dev/null || echo "unknown")
            uptime=$(echo "$health_data" | jq -r '.uptime' 2>/dev/null || echo "unknown")
            memory_percent=$(echo "$health_data" | jq -r '.memory.percentage' 2>/dev/null || echo "unknown")

            echo -e "${BLUE}   Status: $status${NC}"
            echo -e "${BLUE}   Uptime: $uptime ms${NC}"
            echo -e "${BLUE}   Memory: $memory_percent%${NC}"
        fi
    else
        echo -e "${RED}❌ Application is not responding${NC}"
    fi

    # Check alerts
    echo ""
    echo -e "${BLUE}🚨 Active Alerts${NC}"
    if curl -s "$ALERTS_ENDPOINT" > /dev/null 2>&1; then
        alerts_data=$(curl -s "$ALERTS_ENDPOINT" 2>/dev/null)
        active_alerts=$(echo "$alerts_data" | jq '.summary.active' 2>/dev/null || echo "0")

        if [[ "$active_alerts" -gt 0 ]]; then
            echo -e "${RED}🚨 $active_alerts active alert(s)${NC}"

            # Show recent alerts
            echo "$alerts_data" | jq -r '.alerts[] | select(.resolved == false) | "   • \(.title) (\(.severity))"' 2>/dev/null | head -5
        else
            echo -e "${GREEN}✅ No active alerts${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Unable to fetch alerts${NC}"
    fi
}

# Function to show monitoring report
show_report() {
    echo -e "${BLUE}📊 Monitoring Report${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # Collect monitoring data
    if curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${BLUE}🔍 Health Check Results${NC}"

        health_data=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null)
        echo "$health_data" | jq '.' 2>/dev/null || echo "Unable to parse health data"
    else
        echo -e "${YELLOW}⚠️ Health endpoint not available${NC}"
    fi

    echo ""

    if curl -s "$METRICS_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${BLUE}📈 System Metrics${NC}"

        metrics_data=$(curl -s "$METRICS_ENDPOINT" 2>/dev/null)

        # Show key metrics
        memory_percent=$(echo "$metrics_data" | jq -r '.metrics.memory_percentage[-1].value' 2>/dev/null || echo "N/A")
        cpu_usage=$(echo "$metrics_data" | jq -r '.metrics.cpu_usage[-1].value' 2>/dev/null || echo "N/A")
        uptime=$(echo "$metrics_data" | jq -r '.metrics.app_uptime[-1].value' 2>/dev/null || echo "N/A")

        echo -e "${BLUE}   Memory Usage: $memory_percent%${NC}"
        echo -e "${BLUE}   CPU Usage: $cpu_usage%${NC}"
        echo -e "${BLUE}   Uptime: $uptime seconds${NC}"

        # Show metrics summary
        echo ""
        echo -e "${BLUE}📊 Metrics Summary${NC}"
        echo "$metrics_data" | jq '.summary' 2>/dev/null || echo "Unable to parse metrics summary"
    else
        echo -e "${YELLOW}⚠️ Metrics endpoint not available${NC}"
    fi

    echo ""

    if curl -s "$ALERTS_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${BLUE}🚨 Alert Summary${NC}"

        alerts_data=$(curl -s "$ALERTS_ENDPOINT" 2>/dev/null)
        echo "$alerts_data" | jq '.summary' 2>/dev/null || echo "Unable to parse alerts summary"

        # Show recent alerts
        echo ""
        echo -e "${BLUE}📋 Recent Alerts${NC}"
        echo "$alerts_data" | jq -r '.alerts[] | "• \(.timestamp): \(.title) (\(.severity))"' 2>/dev/null | head -10
    else
        echo -e "${YELLOW}⚠️ Alerts endpoint not available${NC}"
    fi

    echo ""
    echo -e "${BLUE}📁 Log Files${NC}"
    [[ -f "$PROJECT_ROOT/monitoring.log" ]] && echo -e "${BLUE}   Monitoring log: $PROJECT_ROOT/monitoring.log${NC}"
    [[ -f "$PROJECT_ROOT/logs/app.log" ]] && echo -e "${BLUE}   Application log: $PROJECT_ROOT/logs/app.log${NC}"
    [[ -f "$PROJECT_ROOT/logs/error.log" ]] && echo -e "${BLUE}   Error log: $PROJECT_ROOT/logs/error.log${NC}"
}

# Function to perform health check
perform_health_check() {
    echo -e "${BLUE}🔍 Performing Health Check${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # Check application health
    echo -e "${YELLOW}📡 Checking application health...${NC}"
    if curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        health_data=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null)
        status=$(echo "$health_data" | jq -r '.status' 2>/dev/null)
        uptime=$(echo "$health_data" | jq -r '.uptime' 2>/dev/null)

        if [[ "$status" == "healthy" ]]; then
            echo -e "${GREEN}✅ Application is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️ Application status: $status${NC}"
        fi

        echo -e "${BLUE}   Uptime: $uptime ms${NC}"

        # Show detailed health information
        echo ""
        echo -e "${BLUE}📋 Health Details${NC}"
        echo "$health_data" | jq '.' 2>/dev/null | head -20
    else
        echo -e "${RED}❌ Application health check failed${NC}"
    fi

    echo ""

    # Check monitoring service
    echo -e "${YELLOW}🔍 Checking monitoring service...${NC}"
    if is_monitoring_running; then
        echo -e "${GREEN}✅ Monitoring service is running${NC}"

        # Show monitoring PID
        if [[ -f "$PROJECT_ROOT/monitoring.pid" ]]; then
            MONITORING_PID=$(cat "$PROJECT_ROOT/monitoring.pid")
            echo -e "${BLUE}   Monitoring PID: $MONITORING_PID${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Monitoring service is not running${NC}"
        echo -e "${BLUE}   Start with: ./scripts/monitoring.sh start${NC}"
    fi

    echo ""

    # Check system resources
    echo -e "${YELLOW}💻 System Resources${NC}"

    # Memory usage
    if command -v free &> /dev/null; then
        memory_info=$(free -m | grep Mem)
        total_memory=$(echo $memory_info | awk '{print $2}')
        used_memory=$(echo $memory_info | awk '{print $3}')
        memory_percent=$((used_memory * 100 / total_memory))

        echo -e "${BLUE}   Memory: $used_memory/$total_memory MB ($memory_percent%)${NC}"
    fi

    # Disk usage
    if command -v df &> /dev/null; then
        disk_info=$(df -h . | tail -1)
        echo -e "${BLUE}   Disk: $disk_info${NC}"
    fi

    # CPU usage
    if command -v top &> /dev/null; then
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        echo -e "${BLUE}   CPU: $cpu_usage%${NC}"
    fi

    echo ""
    echo -e "${BLUE}✅ Health check completed${NC}"
}

# Main command handler
case "${1:-help}" in
    "start")
        start_monitoring
        ;;
    "stop")
        stop_monitoring
        ;;
    "status")
        check_status
        ;;
    "report")
        show_report
        ;;
    "health")
        perform_health_check
        ;;
    "restart")
        echo -e "${YELLOW}🔄 Restarting monitoring system...${NC}"
        stop_monitoring
        sleep 2
        start_monitoring
        ;;
    "logs")
        echo -e "${BLUE}📋 Monitoring Logs${NC}"
        echo ""
        if [[ -f "$PROJECT_ROOT/monitoring.log" ]]; then
            echo -e "${BLUE}=== Monitoring Service Logs ===${NC}"
            tail -50 "$PROJECT_ROOT/monitoring.log"
        else
            echo -e "${YELLOW}⚠️ No monitoring logs found${NC}"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "Open Hivemind Monitoring System"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start the monitoring system"
        echo "  stop      Stop the monitoring system"
        echo "  status    Show monitoring system status"
        echo "  report    Show detailed monitoring report"
        echo "  health    Perform health check"
        echo "  restart   Restart the monitoring system"
        echo "  logs      Show monitoring logs"
        echo "  help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 status"
        echo "  $0 report"
        echo ""
        echo "Endpoints:"
        echo "  Health:  $HEALTH_ENDPOINT"
        echo "  Metrics: $METRICS_ENDPOINT"
        echo "  Alerts:  $ALERTS_ENDPOINT"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac