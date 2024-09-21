# ---- Stage 1: Build Environment ----
FROM node:20 AS build

WORKDIR /app

# Copy only package files to install dependencies (for better caching)
COPY package*.json ./

# Install necessary build tools and system dependencies
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y ffmpeg libsodium-dev libopus-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
RUN npm ci

# Copy only the necessary files for the build
COPY src/ ./src
COPY config/ ./config
COPY tsconfig.json .

# Compile TypeScript into JavaScript (output goes to `dist/` directory)
RUN npm run build

# ---- Stage 2: Production Environment ----
FROM node:20-slim AS production

WORKDIR /app

# Copy the compiled files and configuration from the build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/config /app/config
COPY --from=build /app/package.json /app/package-lock.json .

# Copy the src/scripts folder to /scripts in the container
COPY --from=build /app/src/scripts /scripts

# Install only production dependencies
RUN npm ci --production

# Clean up unnecessary files
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the default command to start the application
CMD ["node", "dist/src/index.js"]
