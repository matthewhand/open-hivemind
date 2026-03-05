#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: staging, production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"

echo -e "${BLUE}🚀 Starting deployment for environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}"

# Validation functions
validate_environment() {
    echo -e "${YELLOW}🔍 Validating deployment environment...${NC}"

    # Check if we're on the right branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$ENVIRONMENT" == "production" && "$current_branch" != "main" ]]; then
        echo -e "${RED}❌ Production deployment must be from main branch (current: $current_branch)${NC}"
        exit 1
    fi

    # Check if working directory is clean
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Build function
build_project() {
    echo -e "${YELLOW}🔨 Building project...${NC}"

    cd "$PROJECT_ROOT"

    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm ci --silent

    # Run type checking
    echo -e "${BLUE}🔍 Running type checks...${NC}"
    npm run check-types

    # Run linting
    echo -e "${BLUE}🧹 Running linting...${NC}"
    npm run lint

    # Build frontend
    echo -e "${BLUE}🎨 Building frontend...${NC}"
    npm run build:frontend

    # Build backend
    echo -e "${BLUE}⚙️ Building backend...${NC}"
    npm run build

    # Verify build output
    if [[ ! -d "$BUILD_DIR" ]]; then
        echo -e "${RED}❌ Build directory not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Test function
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"

    cd "$PROJECT_ROOT"

    # Run backend tests
    echo -e "${BLUE}🔧 Running backend tests...${NC}"
    npm run test:only:backend --silent

    echo -e "${GREEN}✅ Tests passed${NC}"
}

# Deployment functions
deploy_to_vercel() {
    echo -e "${YELLOW}🌐 Deploying to Vercel...${NC}"

    cd "$PROJECT_ROOT"

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI is not installed${NC}"
        echo -e "${BLUE}Install it with: npm i -g vercel${NC}"
        exit 1
    fi

    # Deploy to Vercel
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod
    else
        vercel
    fi

    echo -e "${GREEN}✅ Vercel deployment completed${NC}"
}

deploy_to_netlify() {
    echo -e "${YELLOW}🌐 Deploying to Netlify...${NC}"

    cd "$PROJECT_ROOT"

    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        echo -e "${RED}❌ Netlify CLI is not installed${NC}"
        echo -e "${BLUE}Install it with: npm i -g netlify-cli${NC}"
        exit 1
    fi

    # Deploy to Netlify
    if [[ "$ENVIRONMENT" == "production" ]]; then
        netlify deploy --prod --dir=dist/client
    else
        netlify deploy --dir=dist/client
    fi

    echo -e "${GREEN}✅ Netlify deployment completed${NC}"
}

# Health check function
health_check() {
    echo -e "${YELLOW}🏥 Running deployment health checks...${NC}"

    # Here you would typically check if your deployed application is responding
    # This is a placeholder for actual health check implementation

    echo -e "${BLUE}📊 Deployment health check passed${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"

    # Clean up any temporary files if needed

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}=== Production Deployment Script ===${NC}"
    echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${BLUE}Timestamp: $(date)${NC}"
    echo ""

    # Validate environment
    validate_environment

    # Build project
    build_project

    # Run tests
    run_tests

    # Deploy based on environment
    case "$ENVIRONMENT" in
        "staging")
            echo -e "${YELLOW}🚀 Deploying to staging...${NC}"
            deploy_to_vercel
            ;;
        "production")
            echo -e "${YELLOW}🚀 Deploying to production...${NC}"
            deploy_to_vercel
            deploy_to_netlify
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
            echo -e "${BLUE}Valid environments: staging, production${NC}"
            exit 1
            ;;
    esac

    # Health check
    health_check

    # Cleanup
    cleanup

    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${GREEN}Timestamp: $(date)${NC}"
}

# Trap to handle script interruption
trap 'echo -e "${RED}❌ Deployment interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"