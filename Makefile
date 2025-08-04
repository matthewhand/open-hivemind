# Makefile for running tests with uv and Jest
# Targets:
#   make test       - quiet run with coverage summary
#   make test-watch - watch mode (non-quiet) for local dev
#   make test-ci    - CI-friendly: quiet with coverage and JUnit (if configured)

SHELL := /bin/bash

# Detect uv; fall back to plain npm if not available
UV := $(shell command -v uv 2>/dev/null)
ifeq ($(UV),)
RUN := npm
RUN_TEST := npm test
else
RUN := uv run -q
RUN_TEST := uv run -q npm test --silent
endif

# Common Jest args
COVERAGE_ARGS := --coverage --coverageReporters=text-summary
WATCH_ARGS := --watch

# Allow extra jest args via ARGS, e.g.:
# make test ARGS="--testPathPattern=ChannelRouter"
ARGS ?=

.PHONY: test test-watch test-ci

test:
	@echo "Running tests (quiet) with coverage via: $(RUN_TEST)"
	@$(RUN_TEST) -- $(COVERAGE_ARGS) $(ARGS)

test-watch:
	@echo "Running tests in watch mode via: $(RUN_TEST)"
	@$(RUN_TEST) -- $(WATCH_ARGS) $(ARGS)

test-ci:
	@echo "Running CI tests (quiet) with coverage via: $(RUN_TEST)"
	@$(RUN_TEST) -- $(COVERAGE_ARGS) $(ARGS)