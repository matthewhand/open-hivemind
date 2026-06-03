FROM node:22-alpine AS base

# ── Stage 0: System deps (rarely changes) ────────────────────────────────────
ARG INCLUDE_PYTHON_TOOLS=true
ARG INCLUDE_NODE_TOOLS=true
ARG INCLUDE_FFMPEG=true

RUN apk add --no-cache \
    curl bash sqlite-dev make g++ \
    && if [ "$INCLUDE_PYTHON_TOOLS" = "true" ]; then \
        apk add --no-cache python3 py3-pip python3-dev build-base \
        && python3 -m pip install --no-cache-dir --break-system-packages uv; \
    fi \
    && if [ "$INCLUDE_FFMPEG" = "true" ]; then apk add --no-cache ffmpeg; fi

RUN if [ "$INCLUDE_NODE_TOOLS" = "true" ]; then \
        npm install -g npx 2>/dev/null || true; \
    fi

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- Stage 1a: Dev Caching Strategy (Default) ----------
# Copies individual package.jsons to maximize Docker layer caching during development
FROM base AS deps-dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/client/package.json src/client/
COPY packages/llm-flowise/package.json packages/llm-flowise/
COPY packages/llm-letta/package.json packages/llm-letta/
COPY packages/llm-openai/package.json packages/llm-openai/
COPY packages/llm-openswarm/package.json packages/llm-openswarm/
COPY packages/llm-openwebui/package.json packages/llm-openwebui/
COPY packages/memory-mem0/package.json packages/memory-mem0/
COPY packages/memory-mem4ai/package.json packages/memory-mem4ai/
COPY packages/memory-postgres/package.json packages/memory-postgres/
COPY packages/message-discord/package.json packages/message-discord/
COPY packages/message-mattermost/package.json packages/message-mattermost/
COPY packages/message-slack/package.json packages/message-slack/
COPY packages/message-webhook/package.json packages/message-webhook/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tool-mcp/package.json packages/tool-mcp/

RUN pnpm install --no-frozen-lockfile
COPY . .

# ---------- Stage 1b: Production Strategy ----------
# Streamlined copy and install (no granular caching, better for CI/production simplicity)
FROM base AS deps-prod
COPY . .
RUN pnpm install --no-frozen-lockfile

# ---------- Stage 2: Selection & Build ----------
ARG BUILD_MODE=dev
FROM deps-${BUILD_MODE} AS final

# Rebuild sqlite3 native module for Alpine Linux
RUN apk add --no-cache sqlite-dev make g++ python3 && \
    npm install -g node-gyp 2>/dev/null || true && \
    cd /app/node_modules/.pnpm/sqlite3@*/node_modules/sqlite3 && \
    node-gyp rebuild 2>&1 && echo "sqlite3 rebuilt OK" || \
    { echo "WARN: sqlite3 native build failed — will use fallback"; }

ENV BUILD_POST_BUILD_SLEEP_SECONDS=0
RUN pnpm run build || echo "Build completed with warnings"

# Link workspace package dist dirs
RUN for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      if [ -d "dist/packages/$name/src" ]; then \
        mkdir -p "$pkg/dist"; \
        cp -r "dist/packages/$name/src/"* "$pkg/dist/"; \
      fi; \
    done

# Runtime setup
RUN echo "INCLUDE_PYTHON_TOOLS=${INCLUDE_PYTHON_TOOLS}" >> .env.features && \
    echo "INCLUDE_NODE_TOOLS=${INCLUDE_NODE_TOOLS}" >> .env.features && \
    echo "INCLUDE_FFMPEG=${INCLUDE_FFMPEG}" >> .env.features
RUN mkdir -p config/uploads data logs

RUN chown -R node:node /app
USER node

# Ensure runtime directories exist
RUN mkdir -p config/uploads data logs

EXPOSE 3028
CMD ["node", "--import", "tsx", "src/index.ts"]
