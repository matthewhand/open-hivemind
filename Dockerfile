# Global build arg — must be declared before the first FROM to be usable
# in FROM lines (stage-scoped ARGs are invisible there and expand empty).
ARG BUILD_MODE=dev

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
# Copies the manifests plus the packages tree before installing. A hardcoded
# per-package COPY list silently breaks whenever a workspace package is added
# (pnpm fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND), and the legacy builder
# builds this stage even when targeting deps-prod — so prefer correctness
# over per-manifest layer caching here.
FROM base AS deps-dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/client/package.json src/client/
COPY packages packages

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
# Hard-fail the image build if compilation fails — a tsx-at-runtime fallback
# cannot boot within small-VM memory limits (e.g. Fly 256MB).
RUN pnpm run build

# Link workspace package dist dirs
# Symlink (not copy): compiled package files contain relative requires into
# the dist/ tree (e.g. ../../../src/config/...) that break if relocated.
# Node resolves the symlink's real path, so requires stay inside dist/.
RUN for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      if [ -d "dist/packages/$name/src" ]; then \
        rm -rf "$pkg/dist"; \
        ln -sfn "/app/dist/packages/$name/src" "${pkg%/}/dist"; \
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
# Run the compiled backend. tsx runtime compilation needs >256MB at boot and
# OOM-thrashes on small VMs; compiled JS boots fast and lean.
# NODE_ENV=production also activates module-alias (dist/ path aliases).
ENV NODE_ENV=production
CMD ["node", "dist/src/index.js"]
