FROM node:22-alpine

# Install Python and additional tools based on feature flags
# Set default feature flags - these can be overridden during build
ARG INCLUDE_PYTHON_TOOLS=true
ARG INCLUDE_NODE_TOOLS=true
ARG INCLUDE_FFMPEG=true

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    && if [ "$INCLUDE_PYTHON_TOOLS" = "true" ]; then \
        apk add --no-cache \
            python3 \
            py3-pip \
            python3-dev \
            build-base \
            && python3 -m pip install --no-cache-dir --break-system-packages uv \
        ; fi

# Install Node.js tools (MCP CLI is optional until package is published)
RUN if [ "$INCLUDE_NODE_TOOLS" = "true" ]; then \
        npm install -g npx; \
        if npm view @modelcontextprotocol/cli >/dev/null 2>&1; then \
            npm install -g @modelcontextprotocol/cli; \
        else \
            echo "Skipping @modelcontextprotocol/cli install (package not available)"; \
        fi; \
    fi

# Install ffmpeg for Discord voice support if enabled
RUN if [ "$INCLUDE_FFMPEG" = "true" ]; then \
        apk add --no-cache ffmpeg; \
    fi

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/client/package.json src/client/
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --no-frozen-lockfile

COPY . .

# Rebuild sqlite3 native module for Alpine Linux
RUN apk add --no-cache sqlite-dev make g++ python3 && \
    cd /app/node_modules/.pnpm/sqlite3@*/node_modules/sqlite3 && \
    npm run build-release 2>&1 || \
    (npx --yes node-gyp rebuild 2>&1 && echo "sqlite3 rebuilt via node-gyp") || \
    echo "WARN: sqlite3 native build failed, DB features may be unavailable"

ENV BUILD_POST_BUILD_SLEEP_SECONDS=0
RUN pnpm run build

# Link compiled workspace packages from dist/packages/*/src/ to packages/*/dist/
RUN for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      if [ -d "dist/packages/$name/src" ]; then \
        mkdir -p "$pkg/dist"; \
        cp -r "dist/packages/$name/src/"* "$pkg/dist/"; \
      fi; \
    done

# Create feature flag environment file
RUN echo "INCLUDE_PYTHON_TOOLS=${INCLUDE_PYTHON_TOOLS}" >> .env.features && \
    echo "INCLUDE_NODE_TOOLS=${INCLUDE_NODE_TOOLS}" >> .env.features && \
    echo "INCLUDE_FFMPEG=${INCLUDE_FFMPEG}" >> .env.features

EXPOSE 3028
CMD ["node", "dist/src/index.js"]
