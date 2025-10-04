FROM node:18-alpine

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
            && pip3 install --no-cache uvx \
        ; fi

# Install Node.js tools if enabled
RUN if [ "$INCLUDE_NODE_TOOLS" = "true" ]; then \
        npm install -g \
            npx \
            @modelcontextprotocol/cli \
        ; fi

# Install ffmpeg for Discord voice support if enabled
RUN if [ "$INCLUDE_FFMPEG" = "true" ]; then \
        apk add --no-cache ffmpeg; \
    fi

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Create feature flag environment file
RUN echo "INCLUDE_PYTHON_TOOLS=${INCLUDE_PYTHON_TOOLS}" >> .env.features && \
    echo "INCLUDE_NODE_TOOLS=${INCLUDE_NODE_TOOLS}" >> .env.features && \
    echo "INCLUDE_FFMPEG=${INCLUDE_FFMPEG}" >> .env.features

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]