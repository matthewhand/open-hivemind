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
FROM node:20-buster
WORKDIR /usr/src/app

# Install Node dependencies first for caching
COPY package*.json ./

# Install FFmpeg, libsodium and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    g++ \
    make \
    libtool \
    autoconf \
    automake \
    libsodium-dev \
    libsodium23 \
    libopus-dev

# Install encryption packages and opus separately
#RUN npm install sodium
#RUN npm install sodium-native
#RUN npm install libsodium-wrappers
#RUN npm install tweetnacl
#RUN npm install @discordjs/voice
#RUN npm install opusscript

# Copy app source from src to root in the container
COPY src/ .
#COPY entrypoint.sh ./

RUN ls -latr 

# Install Node dependencies
RUN npm install -g npm@latest
#RUN npm install
RUN npm ci

# workaround
RUN mkdir src

# Combine debug steps into a single step
#COPY src/dependencyReport.js src/test-libs.js src/
#RUN npm run dep-report && npm run test-libs

RUN ls -latr node_modules
RUN ls -latr src/

# Make the entrypoint script executable
#RUN chmod +x ./entrypoint.sh

# Copy Python environment
#COPY --from=python-env /usr/local /usr/local

CMD [ "node", "index.js" ]
