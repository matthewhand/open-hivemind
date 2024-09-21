# ---- Build Python Environment ----
#FROM python:3.9-slim-buster AS python-env
#WORKDIR /usr/src/python-env
#MH 20240404 workaround... disable python
#RUN apt-get update && apt-get install -y gcc python3-dev
#RUN pip install --upgrade pip
#RUN pip install --no-cache-dir psutil requests bs4 opencv-python numpy nltk

## Install Ollama
#RUN pip install ollama

# ---- Build Node Environment ----
FROM node:20 AS build

WORKDIR /app

# Install Node dependencies first for caching
COPY package*.json ./

# Update and build essentials
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    build-essential \
    jq 
    # ... and jq is just useful

## Install FFmpeg, libsodium and other dependencies
#RUN apt-get install -y \
#    ffmpeg \
#    gcc \
#    g++ \
#    make \
#    libtool \
#    autoconf \
#    automake \
#    libsodium-dev \
#    libsodium23 \
#    libopus-dev

## Update Python to a version compatible with node-gyp
#RUN apt-get install -y python3 python3-dev

COPY . .
RUN ls -latr 
#RUN npm install
#RUN npm install -g typescript

# Install Node dependencies
RUN npm install -g npm@latest
RUN npm ci

# Compile TypeScript to JavaScript
RUN which tsc
RUN npm run build

# Stage 2: Production
FROM build AS production

WORKDIR /app

## Include Python because it is as popular as TypeScript
#RUN apt-get update && apt-get upgrade -y && apt-get install -y \
#    python3 \
#    python3-pip \
#    jq 
#    # ... and jq is just useful

# Copy compiled files and package.json/package-lock.json from build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json /app/package-lock.json

# Install production dependencies
RUN npm ci --production

CMD [ "node", "dist/src/index.js" ]
