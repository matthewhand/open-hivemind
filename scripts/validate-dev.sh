#!/bin/bash

# Development Environment Validation Script
# Usage: ./scripts/validate-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUIRED_NODE_VERSION="18"
REQUIRED_NPM_VERSION="8"

echo -e "${BLUE}🔧 Development Environment Validation${NC}"
echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}"

# Validation results
VALIDATIONS_PASSED=0
VALIDATIONS_FAILED=0

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((VALIDATIONS_PASSED++))
}

log_failure() {
    echo -e "${RED}❌ $1${NC}"
    ((VALIDATIONS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Validation functions
validate_node_version() {
    log_info "Checking Node.js version..."

    if ! command -v node &> /dev/null; then
        log_failure "Node.js is not installed"
        return
    fi

    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)

    if [[ $major_version -lt $REQUIRED_NODE_VERSION ]]; then
        log_failure "Node.js version $node_version is too old (required: >= $REQUIRED_NODE_VERSION)"
    else
        log_success "Node.js version $node_version"
    fi
}

validate_npm_version() {
    log_info "Checking npm version..."

    if ! command -v npm &> /dev/null; then
        log_failure "npm is not installed"
        return
    fi

    local npm_version=$(npm --version)
    local major_version=$(echo $npm_version | cut -d. -f1)

    if [[ $major_version -lt $REQUIRED_NPM_VERSION ]]; then
        log_failure "npm version $npm_version is too old (required: >= $REQUIRED_NPM_VERSION)"
    else
        log_success "npm version $npm_version"
    fi
}

validate_git() {
    log_info "Checking Git configuration..."

    if ! command -v git &> /dev/null; then
        log_failure "Git is not installed"
        return
    fi

    local git_email=$(git config user.email)
    local git_name=$(git config user.name)

    if [[ -z "$git_email" ]]; then
        log_failure "Git user.email is not configured"
    else
        log_success "Git user.email configured"
    fi

    if [[ -z "$git_name" ]]; then
        log_failure "Git user.name is not configured"
    else
        log_success "Git user.name configured"
    fi
}

validate_project_dependencies() {
    log_info "Checking project dependencies..."

    cd "$PROJECT_ROOT"

    if [[ ! -f "package.json" ]]; then
        log_failure "package.json not found"
        return
    fi

    if [[ ! -d "node_modules" ]]; then
        log_warning "node_modules not found - run 'npm install'"
        ((VALIDATIONS_FAILED++))
        return
    fi

    # Check if critical dependencies are installed
    local critical_deps=("typescript" "react" "express" "vite")
    for dep in "${critical_deps[@]}"; do
        if npm list "$dep" &> /dev/null; then
            log_success "Dependency $dep is installed"
        else
            log_failure "Dependency $dep is missing"
        fi
    done
}

validate_environment_files() {
    log_info "Checking environment configuration..."

    cd "$PROJECT_ROOT"

    # Check for .env files
    if [[ -f ".env.sample" ]]; then
        log_success ".env.sample exists"

        if [[ -f ".env" ]]; then
            log_success ".env exists"
        else
            log_warning ".env not found - copy from .env.sample"
            ((VALIDATIONS_FAILED++))
        fi
    else
        log_warning ".env.sample not found"
    fi

    # Check for config directory
    if [[ -d "config" ]]; then
        log_success "config directory exists"
    else
        log_failure "config directory not found"
    fi
}

validate_build_system() {
    log_info "Checking build system..."

    cd "$PROJECT_ROOT"

    # Check TypeScript configuration
    if [[ -f "tsconfig.json" ]]; then
        log_success "tsconfig.json exists"
    else
        log_failure "tsconfig.json not found"
    fi

    # Check Vite configuration
    if [[ -f "src/client/vite.config.ts" ]]; then
        log_success "vite.config.ts exists"
    else
        log_failure "vite.config.ts not found"
    fi

    # Test TypeScript compilation
    if npm run check-types &> /dev/null; then
        log_success "TypeScript compilation works"
    else
        log_failure "TypeScript compilation failed"
    fi
}

validate_git_hooks() {
    log_info "Checking Git hooks..."

    cd "$PROJECT_ROOT"

    # Check if husky is configured
    if [[ -d ".husky" ]]; then
        log_success "Husky hooks configured"
    else
        log_warning "Husky hooks not configured"
    fi
}

validate_ci_configuration() {
    log_info "Checking CI configuration..."

    cd "$PROJECT_ROOT"

    # Check GitHub Actions workflows
    if [[ -d ".github/workflows" ]]; then
        local workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
        log_success "$workflow_count GitHub Actions workflows found"
    else
        log_warning "GitHub Actions workflows not found"
    fi
}

validate_database_connection() {
    log_info "Checking database configuration..."

    cd "$PROJECT_ROOT"

    # Check if database configuration exists
    if [[ -f "config/database.json" ]] || [[ -f "config/default.json" ]]; then
        log_success "Database configuration found"
    else
        log_warning "Database configuration not found"
    fi
}

validate_ports() {
    log_info "Checking port availability..."

    local ports=(3000 5173 8080)

    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "Port $port is already in use"
            ((VALIDATIONS_FAILED++))
        else
            log_success "Port $port is available"
        fi
    done
}

validate_disk_space() {
    log_info "Checking disk space..."

    local available_space=$(df . | awk 'NR==2 {print $4}')
    local required_space=1048576 # 1GB in KB

    if [[ $available_space -gt $required_space ]]; then
        log_success "Sufficient disk space available"
    else
        log_failure "Insufficient disk space (need at least 1GB)"
    fi
}

# Main validation flow
main() {
    echo -e "${BLUE}=== Development Environment Validation ===${NC}"
    echo -e "${BLUE}Timestamp: $(date)${NC}"
    echo ""

    # Run all validations
    validate_node_version
    validate_npm_version
    validate_git
    validate_project_dependencies
    validate_environment_files
    validate_build_system
    validate_git_hooks
    validate_ci_configuration
    validate_database_connection
    validate_ports
    validate_disk_space

    # Summary
    echo ""
    echo -e "${BLUE}=== Validation Summary ===${NC}"
    echo -e "${GREEN}✅ Passed: $VALIDATIONS_PASSED${NC}"
    echo -e "${RED}❌ Failed: $VALIDATIONS_FAILED${NC}"

    if [[ $VALIDATIONS_FAILED -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}🎉 All validations passed! Development environment is ready.${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo -e "1. Run 'npm run dev' to start development servers"
        echo -e "2. Run 'npm run test' to run tests"
        echo -e "3. Visit http://localhost:5173 for frontend"
        echo -e "4. Visit http://localhost:3000 for backend API"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some validations failed. Please fix the issues above.${NC}"
        echo ""
        echo -e "${BLUE}Common fixes:${NC}"
        echo -e "• Install missing dependencies: npm install"
        echo -e "• Update Node.js: use nvm or download from nodejs.org"
        echo -e "• Configure Git: git config --global user.name 'Your Name' && git config --global user.email 'your.email@example.com'"
        echo -e "• Copy environment file: cp .env.example .env"
        exit 1
    fi
}

# Run main function
main "$@"