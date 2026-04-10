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

# ── Layer 3: Source + dependency install ──────────────────────────────────────
# NOTE: split COPY (manifests-only → install → source) breaks pnpm workspace
# resolution for hoisted deps like zustand. Full COPY required.
COPY . .
RUN pnpm install --frozen-lockfile

# Rebuild sqlite3 native module for Alpine
RUN cd /app/node_modules/.pnpm/sqlite3@*/node_modules/sqlite3 && \
    npm run build-release 2>&1 || \
    (npx --yes node-gyp rebuild 2>&1 && echo "sqlite3 rebuilt via node-gyp") || \
    echo "WARN: sqlite3 native build failed"

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

EXPOSE 3000
CMD ["node", "dist/src/index.js"]
