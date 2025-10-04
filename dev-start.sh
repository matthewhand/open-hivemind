#!/bin/bash

# Open-Hivemind Development Startup Script
# This script provides a clean, unified way to start the development environment

set -e  # Exit on any error

echo "🧠 Open-Hivemind Development Startup"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to kill existing processes
cleanup_processes() {
    print_status "Cleaning up existing processes..."
    
    # Kill any existing node processes related to our app
    pkill -f "ts-node.*src/index.ts" 2>/dev/null || true
    pkill -f "vite.*3028" 2>/dev/null || true
    pkill -f "nodemon.*src/index.ts" 2>/dev/null || true
    
    # Wait for processes to terminate
    sleep 2
    
    print_success "Cleanup complete"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        print_warning "Port $port is in use. Attempting to free it..."
        fuser -k $port/tcp 2>/dev/null || true
        sleep 2
    fi
}

# Function to start backend in development mode
start_backend() {
    print_status "Starting backend development server..."
    
    # Build backend first
    print_status "Building backend..."
    npm run build
    
    # Start the backend with nodemon for hot reload
    print_status "Starting backend with hot reload on port 3028..."
    NODE_ENV=development nodemon --exec "./node_modules/.bin/ts-node -r tsconfig-paths/register src/index.ts" &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Check if backend is running
    if lsof -i :3028 >/dev/null 2>&1; then
        print_success "Backend server started successfully on http://localhost:3028"
    else
        print_error "Backend failed to start"
        exit 1
    fi
}

# Function to show running processes
show_processes() {
    print_status "Current running processes:"
    ps aux | grep -E "(nodemon|ts-node|vite)" | grep -v grep || echo "No development processes running"
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    # Parse command line arguments
    case "${1:-dev}" in
        "clean")
            cleanup_processes
            print_success "All processes cleaned up"
            ;;
        "backend")
            cleanup_processes
            check_port 3028
            start_backend
            print_success "Backend development environment ready!"
            print_status "Backend: http://localhost:3028"
            print_status "Press Ctrl+C to stop"
            wait
            ;;
        "dev"|"")
            cleanup_processes
            check_port 3028
            start_backend
            print_success "Full development environment ready!"
            print_status "Application: http://localhost:3028"
            print_status "Press Ctrl+C to stop all services"
            
            # Handle cleanup on exit
            trap 'echo ""; print_status "Shutting down..."; cleanup_processes; exit 0' INT TERM
            wait
            ;;
        "status")
            show_processes
            ss -tlnp | grep -E ":302[0-9]" || echo "No ports 3020-3029 in use"
            ;;
        *)
            echo "Usage: $0 [clean|backend|dev|status]"
            echo "  clean   - Stop all development processes"
            echo "  backend - Start only backend with hot reload"
            echo "  dev     - Start full development environment (default)"
            echo "  status  - Show current process and port status"
            exit 1
            ;;
    esac
}

main "$@"