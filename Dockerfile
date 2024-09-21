# ---- Stage 1: Build Environment ----
# Using full Node.js base image for building, as we need compilers and dev tools
FROM node:20 AS build

# Set working directory inside the container
WORKDIR /app

# Copy only package files to install dependencies (for better caching)
COPY package*.json ./

# Install necessary build tools and system dependencies
# `ffmpeg`, `libsodium`, and `libopus` are needed for audio processing and encryption
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y ffmpeg libsodium-dev libopus-dev && \
    # Clean up apt cache to reduce image size
    rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies without generating unnecessary files (like npm cache)
RUN npm ci

# Copy only the necessary files for the build (typescript source, config, etc.)
COPY src/ ./src
COPY config/ ./config
COPY tsconfig.json .

# Compile TypeScript into JavaScript (output goes to `dist/` directory)
RUN npm run build

# ---- Stage 2: Production Environment ----
# Use a smaller Node.js base image for production to keep the image lightweight
FROM node:20-slim AS production

# Set working directory inside the container
WORKDIR /app

# Copy only the compiled files and configuration from the build stage
# This prevents bringing over unnecessary files from the build process
COPY --from=build /app/dist /app/dist
COPY --from=build /app/config /app/config
COPY --from=build /app/package.json /app/package-lock.json .

# Install only production dependencies (ignoring dev dependencies to reduce size)
RUN npm ci --production

# Perform additional cleanup to keep the image size small
# Clean up any npm cache or unnecessary files
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the default command to start the application using the compiled JavaScript
CMD ["node", "dist/src/index.js"]
