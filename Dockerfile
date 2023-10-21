# ---- Build Python Environment ----
FROM python:3.9-slim AS python-env
WORKDIR /usr/src/python-env
RUN pip install --no-cache-dir psutil requests

# ---- Build Node Environment ----
FROM node:16
WORKDIR /usr/src/app

# Copy Python environment
COPY --from=python-env /usr/local /usr/local

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Copy commands
RUN mkdir -p commands
COPY commands/* ./commands/

CMD [ "node", "index.js" ]
