FROM node:22-alpine

# ── Layer 1: System deps (rarely changes) ────────────────────────────────────
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

# ── Layer 2: pnpm setup (rarely changes) ─────────────────────────────────────
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Layer 3: Manifests only → install (cached unless lockfile/deps change) ────
# Copy workspace config and every package.json without any source files.
# pnpm install only needs the dependency graph — not the TS source.
# None of the workspace packages have "prepare" scripts, so install is safe
# without source present.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
# Root-level config files needed by the build
COPY packages/llm-flowise/package.json      packages/llm-flowise/
COPY packages/llm-letta/package.json        packages/llm-letta/
COPY packages/llm-openai/package.json       packages/llm-openai/
COPY packages/llm-openswarm/package.json    packages/llm-openswarm/
COPY packages/llm-openwebui/package.json    packages/llm-openwebui/
COPY packages/memory-mem0/package.json      packages/memory-mem0/
COPY packages/memory-mem4ai/package.json    packages/memory-mem4ai/
COPY packages/message-discord/package.json  packages/message-discord/
COPY packages/message-mattermost/package.json packages/message-mattermost/
COPY packages/message-slack/package.json    packages/message-slack/
COPY packages/shared-types/package.json     packages/shared-types/
COPY packages/tool-mcp/package.json         packages/tool-mcp/
COPY src/client/package.json                src/client/
RUN pnpm install --frozen-lockfile

# Rebuild sqlite3 native module for Alpine (cached with install layer)
RUN cd /app/node_modules/.pnpm/sqlite3@*/node_modules/sqlite3 && \
    npm run build-release 2>&1 || \
    (npx --yes node-gyp rebuild 2>&1 && echo "sqlite3 rebuilt via node-gyp") || \
    echo "WARN: sqlite3 native build failed"

# ── Layer 4: Source → build (only busted on source/config changes) ────────────
COPY . .
ENV BUILD_POST_BUILD_SLEEP_SECONDS=0
RUN pnpm run build

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

# Bootstrap script that configures tsconfig-paths for the dist output
RUN cat > /app/dist/bootstrap.js <<'BOOTSCRIPT'
const { register } = require("tsconfig-paths");
register({
  baseUrl: __dirname,
  paths: {
    "@src/*": ["src/*"],
    "@config/*": ["src/config/*"],
    "@common/*": ["src/common/*"],
    "@llm/*": ["src/llm/*"],
    "@message/*": ["src/message/*"],
    "@webhook/*": ["src/webhook/*"],
    "@command/*": ["src/command/*"],
    "@types/*": ["src/types/*"],
    "@integrations/flowise/*": ["../packages/llm-flowise/dist/*"],
    "@integrations/openwebui/*": ["../packages/llm-openwebui/dist/*"],
    "@integrations/openswarm/*": ["../packages/llm-openswarm/dist/*"],
    "@src/integrations/slack/*": ["../packages/message-slack/dist/*"],
    "@src/integrations/mattermost/*": ["../packages/message-mattermost/dist/*"],
    "@hivemind/shared-types": ["../packages/shared-types/src/index.js"],
    "@hivemind/shared-types/*": ["../packages/shared-types/src/*"],
    "@hivemind/llm-openai": ["../packages/llm-openai/dist/index.js"],
    "@hivemind/llm-openai/*": ["../packages/llm-openai/dist/*"],
    "@hivemind/llm-letta": ["../packages/llm-letta/dist/index.js"],
    "@hivemind/llm-letta/*": ["../packages/llm-letta/dist/*"],
    "@hivemind/message-discord": ["../packages/message-discord/dist/index.js"],
    "@hivemind/message-discord/*": ["../packages/message-discord/dist/*"],
    "@hivemind/message-slack": ["../packages/message-slack/dist/index.js"],
    "@hivemind/message-slack/*": ["../packages/message-slack/dist/*"],
    "@hivemind/message-mattermost": ["../packages/message-mattermost/dist/index.js"],
    "@hivemind/message-mattermost/*": ["../packages/message-mattermost/dist/*"],
    "@hivemind/memory-mem0": ["../packages/memory-mem0/dist/index.js"],
    "@hivemind/memory-mem0/*": ["../packages/memory-mem0/dist/*"],
  },
});
require("./src/index.js");
BOOTSCRIPT

EXPOSE 3028
CMD ["node", "dist/bootstrap.js"]
