# ---- Stage 1: Build Environment ----
FROM node:20-slim AS build

# Define an environment variable to detect low memory environments
ARG LOW_MEMORY=false

WORKDIR /app

# Install system dependencies by default unless LOW_MEMORY is set to "true"
RUN if [ "$LOW_MEMORY" = "true" ]; then \
        echo "Skipping apt-get dependencies due to low-memory environment."; \
    else \
        apt-get update && apt-get upgrade -y && \
        apt-get install -y ffmpeg libsodium-dev libopus-dev && \
        rm -rf /var/lib/apt/lists/*; \
    fi

# Copy package files and install dependencies for building
COPY package*.json ./

RUN npm install

# Copy the source files for building
COPY src/ ./src
COPY config/ ./config
COPY tsconfig.json .
COPY tsconfig.paths.json .

# Compile TypeScript into JavaScript
RUN npm run build

# ---- Stage 2: Production Environment ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy the compiled files and production package files
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --production

# Copy any necessary scripts
COPY --from=build /app/src/scripts /scripts

# Set the default command to start the application
CMD ["node", "dist/src/index.js"]
    