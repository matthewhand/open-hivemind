# Open-Hivemind Startup Options Audit and Makefile
# ================================================
# This Makefile documents ALL startup redundancies and provides clean alternatives
# 
# Original test targets preserved below, startup audit added above

SHELL := /bin/bash

.PHONY: help audit start-dev start-prod build test-app clean deprecated status

# Default target - show startup options
help:
	@echo "🧠 Open-Hivemind Startup Options Audit"
	@echo "======================================"
	@echo ""
	@echo "📊 RECOMMENDED (Active) Commands:"
	@echo "  make start-dev     - Start development environment (RECOMMENDED)"
	@echo "  make start-prod    - Start production build"
	@echo "  make build         - Build for production"
	@echo "  make test-app      - Run application tests"
	@echo "  make clean         - Clean all processes and builds"
	@echo "  make status        - Show current processes and ports"
	@echo ""
	@echo "🗑️  ANALYSIS Commands:"
	@echo "  make deprecated    - Show all deprecated startup methods"
	@echo "  make audit         - Full startup redundancy analysis"
	@echo "  make sloc          - Source lines of code analysis"
	@echo ""
	@echo "📋 LEGACY Test Commands (preserved):"
	@echo "  make test          - Original test runner"
	@echo "  make test-watch    - Watch mode tests"
	@echo "  make test-ci       - CI tests"

# ============================================================================
# RECOMMENDED COMMANDS (Clean, modern approach)
# ============================================================================

start-dev: clean
	@echo "🚀 Starting UNIFIED Development Environment"
	@echo "============================================"
	@echo "This replaces ALL the redundant dev commands"
	@echo "(Using ts-node + tsconfig-paths for live TypeScript + path aliases)"
	@export PORT?=3028; \
	if [ ! -f webui/client/dist/index.html ]; then \
	  echo "⚠️  Frontend build missing (src/client/dist/index.html)"; \
	  echo "🏗️  Building frontend..."; \
	  (cd webui/client && ../../node_modules/.bin/vite build) || { echo "❌ Frontend build failed"; exit 1; }; \
	else \
	  echo "✅ Frontend build present"; \
	fi; \
	NODE_ENV=development PORT=$$PORT nodemon --exec "./node_modules/.bin/ts-node -r tsconfig-paths/register src/index.ts"

start-prod: build
	@echo "🌟 Starting Production Server"
	@echo "============================"
	@NODE_ENV=production node --max-old-space-size=256 dist/src/index.js

# Development with separate Vite HMR (frontend on 5173, backend API on 3028)
start-dev-hmr: clean
	@echo "⚡ Starting Development (Backend + Vite HMR)"
	@echo "Backend: http://localhost:3028  |  Frontend (HMR): http://localhost:5173"
	@echo "Press Ctrl+C to stop both."
	@export PORT?=3028; \
	if [ ! -d webui/client/node_modules ]; then \
	  echo "📦 Installing frontend dependencies (first run)..."; \
	  (cd webui/client && npm install --no-audit --no-fund || true); \
	fi; \
	if [ ! -f webui/client/dist/index.html ]; then \
	  echo "(Optional) You can also run a production build later via make build"; \
	fi; \
	( NODE_ENV=development PORT=$$PORT nodemon --quiet --exec "./node_modules/.bin/ts-node -r tsconfig-paths/register src/index.ts" & echo $$! > .backend.pid ); \
	( cd webui/client && ../../node_modules/.bin/vite --port 5173 --host & echo $$! > ../../.vite.pid ); \
	trap 'echo "\n🛑 Stopping dev services"; kill $$(cat .backend.pid .vite.pid 2>/dev/null) 2>/dev/null || true; rm -f .backend.pid .vite.pid' INT TERM; \
	wait

build:
	@echo "🔨 Building Application"
	@echo "======================"
	@echo "Frontend build..."
	@cd webui/client && ../../node_modules/.bin/vite build
	@echo "Backend build..."
	@npx rimraf dist && mkdir -p dist/scripts && cp src/scripts/* dist/scripts/ && cp -r config dist/ && node node_modules/.bin/tsc
	@echo "Copying frontend to dist..."
	@mkdir -p dist/client && cp -r webui/client/dist dist/client/

test-app:
	@echo "🧪 Running Application Tests"
	@echo "============================"
	@NODE_CONFIG_DIR=config/test/ NODE_ENV=test node -r dotenv/config node_modules/.bin/jest --runInBand --testTimeout=10000

clean:
	@echo "🧹 Cleaning All Processes and Builds"
	@echo "===================================="
	@pkill -f "ts-node.*src/index.ts" 2>/dev/null || true
	@pkill -f "vite.*3028" 2>/dev/null || true
	@pkill -f "nodemon.*src/index.ts" 2>/dev/null || true
	@pkill -f "jest" 2>/dev/null || true
	@fuser -k 3028/tcp 2>/dev/null || true
	@fuser -k 5173/tcp 2>/dev/null || true
	@sleep 2
	@echo "✅ Cleanup complete"

status:
	@echo "📊 Current System Status"
	@echo "========================"
	@echo "Development processes:"
	@ps aux | grep -E "(nodemon|ts-node|vite)" | grep -v grep || echo "  No development processes running"
	@echo ""
	@echo "Ports in use:"
	@ss -tlnp | grep -E ":302[0-9]|:517[0-9]" || echo "  No development ports in use"

# ============================================================================
# REDUNDANCY ANALYSIS
# ============================================================================

deprecated:
	@echo "🗑️  DEPRECATED Startup Methods Analysis"
	@echo "======================================="
	@echo ""
	@echo "❌ REDUNDANT npm scripts in package.json:"
	@echo "   Current scripts: $$(grep -c '"' package.json | head -1) entries"
	@grep -A 30 '"scripts"' package.json | grep -E '"(dev|start)' | sed 's/^/     /'
	@echo ""
	@echo "❌ REDUNDANT files:"
	@echo "   • ./dev-start.sh: $$(wc -l < dev-start.sh 2>/dev/null || echo 0) lines"
	@echo "   • scripts/setup/: $$(find scripts/setup/ -name "*.sh" -exec wc -l {} \; 2>/dev/null | awk '{sum += $$1} END {print sum}' || echo 0) lines"
	@echo ""
	@echo "🎯 SOLUTION: Use ONLY 'make start-dev'"

sloc:
	@echo "📊 Source Lines of Code Analysis"
	@echo "================================"
	@echo "Main server:           $$(wc -l < src/index.ts) lines"
	@echo "Package.json scripts:  $$(grep -A 30 '"scripts"' package.json | wc -l) lines"
	@echo "Dev startup script:    $$(wc -l < dev-start.sh 2>/dev/null || echo 0) lines"
	@echo "Setup scripts:         $$(find scripts/setup/ -name "*.sh" -exec wc -l {} \; 2>/dev/null | awk '{sum += $$1} END {print sum}' || echo 0) lines"
	@echo "This Makefile:         $$(wc -l < Makefile) lines"

audit: sloc deprecated
	@echo ""
	@echo "🔍 STARTUP REDUNDANCY AUDIT COMPLETE"
	@echo "===================================="
	@echo ""
	@echo "📈 PROBLEMS IDENTIFIED:"
	@echo "  • Multiple overlapping dev commands"
	@echo "  • Port confusion (3028 vs 5173)"
	@echo "  • Separate frontend/backend serving"
	@echo ""
	@echo "✅ UNIFIED SOLUTION:"
	@echo "  • ONE command: 'make start-dev'"
	@echo "  • ONE port: 3028"
	@echo "  • ONE process: unified server"

# ============================================================================
# LEGACY TEST COMMANDS (Preserved from original Makefile)
# ============================================================================

# Detect uv; fall back to plain npm if not available
UV := $(shell command -v uv 2>/dev/null)
ifeq ($(UV),)
RUN := npm
RUN_TEST := npm test -- --config ./jest.config.js
else
RUN := uv run -q
# Always pass explicit Jest config to avoid conflicts with package.json "jest" key
RUN_TEST := uv run -q npm test --silent -- --config ./jest.config.js
endif

# Common Jest args
COVERAGE_ARGS := --coverage --coverageReporters=text-summary
WATCH_ARGS := --watch

# Allow extra jest args via ARGS, e.g.:
# make test ARGS="--testPathPattern=ChannelRouter"
ARGS ?=

.DEFAULT_GOAL := help
.PHONY: help test test-watch test-ci

help:
	@echo ""
	@echo "Open Hivemind - Make targets"
	@echo "============================"
	@echo "Usage:"
	@echo "  make [target] [ARGS='...'] [ALLOW_CONSOLE=1]"
	@echo ""
	@echo "Targets:"
	@echo "  help           Show this help"
	@echo "  test           Run Jest quietly with coverage summary"
	@echo "  test-watch     Run Jest in watch mode (developer friendly)"
	@echo "  test-ci        Run Jest quietly with coverage (CI friendly)"
	@echo ""
	@echo "Common variables:"
	@echo "  ARGS           Extra arguments passed through to Jest (default: empty)"
	@echo "                 e.g. ARGS='--testPathPattern=ChannelRouter --runInBand'"
	@echo "  ALLOW_CONSOLE  When set to 1, enables console output during tests"
	@echo "                 e.g. ALLOW_CONSOLE=1 make test"
	@echo ""
	@echo "Runner:"
	@echo "  Using: $(RUN_TEST)"
	@echo ""

test:
	@echo "Running tests (quiet) with coverage via: $(RUN_TEST)"
	@$(RUN_TEST) $(COVERAGE_ARGS) $(ARGS)

test-watch:
	@echo "Running tests in watch mode via: $(RUN_TEST)"
	@$(RUN_TEST) $(WATCH_ARGS) $(ARGS)

test-ci:
	@echo "Running CI tests (quiet) with coverage via: $(RUN_TEST)"
	@$(RUN_TEST) $(COVERAGE_ARGS) $(ARGS)