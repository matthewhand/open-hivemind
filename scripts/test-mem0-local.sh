#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# test-mem0-local.sh — Smoke-test a local Mem0 instance
#
# Verifies the self-hosted Mem0 stack (API + Postgres + Neo4j) is healthy
# and that basic CRUD operations work end-to-end.
#
# Usage:
#   ./scripts/test-mem0-local.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:8888
#
# Note: CRUD tests (add/search/get/delete) require a valid LLM API key
# in .env.mem0. Without one the API returns 500 on memory writes but the
# infrastructure (containers, routing, DB connections) is still validated.
# ---------------------------------------------------------------------------
set -euo pipefail

BASE_URL="${1:-http://localhost:8888}"
API_KEY="${MEM0_API_KEY:-}"
PASS=0
FAIL=0
SKIP=0
TESTS=0

# Colours (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; NC=''
fi

auth_header() {
  if [ -n "$API_KEY" ]; then
    echo "Authorization: Token $API_KEY"
  else
    echo "X-No-Auth: true"
  fi
}

pass()  { PASS=$((PASS+1));  TESTS=$((TESTS+1)); printf "${GREEN}  PASS${NC} %s\n" "$1"; }
fail()  { FAIL=$((FAIL+1));  TESTS=$((TESTS+1)); printf "${RED}  FAIL${NC} %s — %s\n" "$1" "$2"; }
skip()  { SKIP=$((SKIP+1));  TESTS=$((TESTS+1)); printf "${YELLOW}  SKIP${NC} %s — %s\n" "$1" "$2"; }

echo ""
echo "============================================="
echo " Mem0 Local Smoke Test"
echo " Base URL: $BASE_URL"
echo "============================================="
echo ""

# ---- 1. Wait for API to be ready ----
# The self-hosted Mem0 API redirects / → /docs (307), so follow redirects.
printf "Waiting for Mem0 API..."
for i in $(seq 1 60); do
  if curl -sf -L -o /dev/null "$BASE_URL/" 2>/dev/null; then
    printf " ready!\n"
    break
  fi
  if [ "$i" -eq 60 ]; then
    printf "\n${RED}ERROR: Mem0 API not reachable at $BASE_URL after 60s${NC}\n"
    echo "Check: docker compose ps"
    echo "Check: docker compose logs mem0"
    exit 1
  fi
  printf "."
  sleep 2
done

# ---- 2. Infrastructure checks ----
echo ""
echo "--- Infrastructure ---"

# Root redirects to /docs (Swagger UI)
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -L "$BASE_URL/")
if [ "$HTTP_CODE" = "200" ]; then
  pass "API docs reachable (GET / → /docs)"
else
  fail "API docs" "got HTTP $HTTP_CODE"
fi

# OpenAPI schema is served
OPENAPI=$(curl -sf "$BASE_URL/openapi.json" 2>&1) || true
if echo "$OPENAPI" | grep -q '"paths"'; then
  pass "OpenAPI schema served (/openapi.json)"
  # Verify expected routes exist
  ROUTES=$(echo "$OPENAPI" | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin).get('paths',{})]" 2>/dev/null)
  for route in /memories /search /reset; do
    if echo "$ROUTES" | grep -q "^${route}$"; then
      pass "Route exists: $route"
    else
      fail "Route missing: $route" "not in OpenAPI schema"
    fi
  done
else
  fail "OpenAPI schema" "could not parse response"
fi

# ---- 3. CRUD Operations (require LLM key) ----
echo ""
echo "--- CRUD Operations ---"

# Add a memory
ADD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/memories" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "messages": [
      {"role": "user", "content": "My favourite programming language is TypeScript."},
      {"role": "assistant", "content": "Noted! You prefer TypeScript."}
    ],
    "user_id": "smoke-test-user"
  }' 2>&1) || true

ADD_CODE=$(echo "$ADD_RESPONSE" | tail -1)
ADD_BODY=$(echo "$ADD_RESPONSE" | sed '$d')

if [ "$ADD_CODE" = "200" ] && echo "$ADD_BODY" | grep -q '"results"'; then
  pass "Add memory (POST /memories)"
  MEMORY_ID=$(echo "$ADD_BODY" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    results = data.get('results', [])
    if results:
        print(results[0].get('id', ''))
except: pass
" 2>/dev/null || true)
elif [ "$ADD_CODE" = "500" ] && echo "$ADD_BODY" | grep -qi "api.key\|api_key\|401\|auth"; then
  skip "Add memory" "LLM API key not configured (expected — set OPENAI_API_KEY in .env.mem0)"
  MEMORY_ID=""
else
  fail "Add memory" "HTTP $ADD_CODE: ${ADD_BODY:0:200}"
  MEMORY_ID=""
fi

# List memories (GET works even without LLM key)
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/memories?user_id=smoke-test-user" \
  -H "$(auth_header)" 2>&1) || true

LIST_CODE=$(echo "$LIST_RESPONSE" | tail -1)
LIST_BODY=$(echo "$LIST_RESPONSE" | sed '$d')

if [ "$LIST_CODE" = "200" ]; then
  pass "List memories (GET /memories)"
else
  fail "List memories" "HTTP $LIST_CODE: ${LIST_BODY:0:200}"
fi

# Search memories
SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "query": "What programming language do I like?",
    "user_id": "smoke-test-user"
  }' 2>&1) || true

SEARCH_CODE=$(echo "$SEARCH_RESPONSE" | tail -1)
SEARCH_BODY=$(echo "$SEARCH_RESPONSE" | sed '$d')

if [ "$SEARCH_CODE" = "200" ]; then
  pass "Search memories (POST /search)"
elif [ "$SEARCH_CODE" = "500" ] && echo "$SEARCH_BODY" | grep -qi "api.key\|api_key\|401\|auth"; then
  skip "Search memories" "LLM API key not configured"
else
  fail "Search memories" "HTTP $SEARCH_CODE: ${SEARCH_BODY:0:200}"
fi

# Get single memory
if [ -n "${MEMORY_ID:-}" ]; then
  GET_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/memories/$MEMORY_ID" \
    -H "$(auth_header)" 2>&1) || true

  if [ "$GET_CODE" = "200" ]; then
    pass "Get memory (GET /memories/$MEMORY_ID)"
  else
    fail "Get memory" "HTTP $GET_CODE"
  fi
else
  skip "Get memory" "no memory ID from add step"
fi

# Delete memory (cleanup)
if [ -n "${MEMORY_ID:-}" ]; then
  DEL_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X DELETE \
    "$BASE_URL/memories/$MEMORY_ID" \
    -H "$(auth_header)" 2>&1) || true

  if [ "$DEL_CODE" = "200" ] || [ "$DEL_CODE" = "204" ]; then
    pass "Delete memory (DELETE /memories/$MEMORY_ID)"
  else
    fail "Delete memory" "HTTP $DEL_CODE"
  fi
else
  skip "Delete memory" "no memory ID from add step"
fi

# ---- 4. Integration Check ----
echo ""
echo "--- Integration Check ---"
HIVEMIND_HEALTH=$(curl -sf "http://localhost:3028/health" 2>/dev/null) || true
if [ -n "$HIVEMIND_HEALTH" ]; then
  pass "Hivemind app is reachable at :3028"
else
  skip "Hivemind reachability" "not running (optional)"
fi

# ---- Summary ----
echo ""
echo "============================================="
printf " Results: ${GREEN}%d passed${NC}" "$PASS"
if [ "$FAIL" -gt 0 ]; then printf ", ${RED}%d failed${NC}" "$FAIL"; fi
if [ "$SKIP" -gt 0 ]; then printf ", ${YELLOW}%d skipped${NC}" "$SKIP"; fi
echo " ($TESTS total)"
echo "============================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "To debug:"
  echo "  docker compose logs mem0"
  echo "  docker compose logs mem0-postgres"
  echo "  docker compose logs mem0-neo4j"
  exit 1
fi

if [ "$SKIP" -gt 0 ]; then
  echo "Some tests skipped — CRUD requires a valid LLM API key."
  echo "Set OPENAI_API_KEY in .env.mem0 for full test coverage."
  echo ""
fi

echo "Mem0 infrastructure is healthy."
echo ""
echo "To connect hivemind, add to config/memory-profiles.json:"
echo ""
echo '  "local-mem0": {'
echo '    "provider": "mem0",'
echo '    "baseUrl": "http://mem0:8000",'
echo '    "apiKey": "not-needed-unless-ADMIN_API_KEY-set",'
echo '    "userId": "default"'
echo '  }'
echo ""
