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

COPY package*.json ./
COPY src/client/package.json src/client/
RUN npm ci && npm cache clean --force

COPY . .
ENV BUILD_POST_BUILD_SLEEP_SECONDS=0
RUN npm run build

# Remove dev dependencies after build to keep runtime image slim
RUN npm prune --omit=dev

# Create feature flag environment file
RUN echo "INCLUDE_PYTHON_TOOLS=${INCLUDE_PYTHON_TOOLS}" >> .env.features && \
    echo "INCLUDE_NODE_TOOLS=${INCLUDE_NODE_TOOLS}" >> .env.features && \
    echo "INCLUDE_FFMPEG=${INCLUDE_FFMPEG}" >> .env.features

EXPOSE 3028

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3028/health || exit 1

CMD ["npm", "start"]
